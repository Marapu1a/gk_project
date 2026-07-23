import {
  CycleStatus,
  CycleType,
  PracticeLevel,
  RecordStatus,
  SupervisionRecordSource,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { targetLevelToGroupName } from '../domain/levels';
import {
  planLegacyPracticeConversions,
  type LegacyPracticeConversion,
} from '../domain/supervision/legacyPracticeRequest';
import { getSupervisorBonusPracticeHours } from '../utils/getSupervisorBonusPracticeHours';
import { getCycleSupervisionTotals } from '../utils/getCycleSupervisionTotals';
import {
  getPracticeToSupervisionRatio,
  getRenewalPracticeToSupervisionRatio,
} from '../utils/supervisionRequirements';

const LEGACY_PRACTICE_TYPES = [
  PracticeLevel.PRACTICE,
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
];
const LEGACY_PRACTICE_TYPE_SET = new Set<PracticeLevel>(LEGACY_PRACTICE_TYPES);

const ALL_PRACTICE_TYPES = [
  ...LEGACY_PRACTICE_TYPES,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

type PlannedConversion = LegacyPracticeConversion & {
  cycleId: string;
  candidate: string;
  reviewer: string;
};

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

async function buildPlan(): Promise<PlannedConversion[]> {
  const cycles = await prisma.certificationCycle.findMany({
    where: {
      status: CycleStatus.ACTIVE,
      supervisionRecords: {
        some: {
          source: SupervisionRecordSource.CURRENT,
          hours: {
            some: {
              type: { in: LEGACY_PRACTICE_TYPES },
              status: RecordStatus.UNCONFIRMED,
              reviewerId: { not: null },
            },
          },
        },
      },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      targetLevel: true,
      user: { select: { fullName: true, email: true } },
      supervisionRecords: {
        where: {
          hours: {
            some: {
              type: { in: ALL_PRACTICE_TYPES },
              status: RecordStatus.UNCONFIRMED,
            },
          },
        },
        select: {
          id: true,
          source: true,
          createdAt: true,
          hours: {
            where: {
              type: { in: ALL_PRACTICE_TYPES },
              status: RecordStatus.UNCONFIRMED,
            },
            select: {
              type: true,
              value: true,
              reviewerId: true,
              reviewer: { select: { fullName: true, email: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: { id: 'asc' },
  });

  const result: PlannedConversion[] = [];

  for (const cycle of cycles) {
    const bonusPractice = (await getSupervisorBonusPracticeHours(cycle.userId, cycle)).value;
    const totals = await getCycleSupervisionTotals(
      cycle.id,
      cycle.targetLevel,
      bonusPractice,
    );
    const groupName = targetLevelToGroupName(cycle.targetLevel);
    const ratio =
      cycle.type === CycleType.RENEWAL
        ? getRenewalPracticeToSupervisionRatio(groupName)
        : getPracticeToSupervisionRatio(groupName);

    const recordMeta = new Map<
      string,
      { shouldConvert: boolean; reviewer: string }
    >();

    const pendingRecords = cycle.supervisionRecords.map((record) => {
      const legacyHours = record.hours.filter(
        (hour) =>
          LEGACY_PRACTICE_TYPE_SET.has(hour.type) &&
          hour.reviewerId !== null,
      );
      const shouldConvert =
        record.source === SupervisionRecordSource.CURRENT &&
        legacyHours.length > 0;
      const reviewerUser = legacyHours.find((hour) => hour.reviewer)?.reviewer;

      recordMeta.set(record.id, {
        shouldConvert,
        reviewer: reviewerUser ? displayName(reviewerUser) : 'Проверяющий не найден',
      });

      return {
        id: record.id,
        practice: record.hours.reduce((sum, hour) => sum + hour.value, 0),
        shouldConvert,
      };
    });

    const cyclePlan = planLegacyPracticeConversions({
      confirmedPractice: totals.practiceConfirmed,
      practiceToSupervisionRatio: ratio,
      pendingRecords,
    });

    for (const conversion of cyclePlan) {
      const meta = recordMeta.get(conversion.id);
      if (!meta?.shouldConvert) continue;

      result.push({
        ...conversion,
        cycleId: cycle.id,
        candidate: displayName(cycle.user),
        reviewer: meta.reviewer,
      });
    }
  }

  return result;
}

async function applyPlan(plan: PlannedConversion[]) {
  for (const item of plan) {
    await prisma.$transaction(async (tx) => {
      const record = await tx.supervisionRecord.findUnique({
        where: { id: item.id },
        select: {
          source: true,
          cycle: { select: { id: true, status: true } },
          hours: {
            select: {
              id: true,
              type: true,
              value: true,
              status: true,
              reviewerId: true,
            },
          },
        },
      });

      if (!record || record.source === SupervisionRecordSource.LEGACY_VERSION) return;
      if (!record.cycle || record.cycle.id !== item.cycleId || record.cycle.status !== CycleStatus.ACTIVE) {
        throw new Error(`Заявка ${item.id}: активный цикл изменился после dry-run`);
      }

      const invalidHour = record.hours.find(
        (hour) =>
          hour.status !== RecordStatus.UNCONFIRMED ||
          !LEGACY_PRACTICE_TYPE_SET.has(hour.type) ||
          !hour.reviewerId,
      );
      if (invalidHour) {
        throw new Error(`Заявка ${item.id}: состав часов изменился после dry-run`);
      }

      const reviewerIds = new Set(record.hours.map((hour) => hour.reviewerId));
      if (record.hours.length === 0 || reviewerIds.size !== 1) {
        throw new Error(`Заявка ${item.id}: не удалось однозначно определить проверяющего`);
      }

      const actualPractice = record.hours.reduce((sum, hour) => sum + hour.value, 0);
      if (Math.abs(actualPractice - item.practice) >= 0.001) {
        throw new Error(`Заявка ${item.id}: сумма часов изменилась после dry-run`);
      }

      const reviewerId = record.hours[0].reviewerId!;

      await tx.supervisionRecord.update({
        where: { id: item.id },
        data: {
          source: SupervisionRecordSource.LEGACY_VERSION,
          draftDirectIndividual: 0,
          draftDirectGroup: 0,
          draftNonObservingIndividual: item.nonObservingIndividual,
          draftNonObservingGroup: 0,
          hours: {
            deleteMany: {
              id: { in: record.hours.map((hour) => hour.id) },
            },
            create: [
              {
                type: PracticeLevel.IMPLEMENTING,
                value: item.implementing,
                status: RecordStatus.UNCONFIRMED,
                reviewerId,
              },
              {
                type: PracticeLevel.PROGRAMMING,
                value: item.programming,
                status: RecordStatus.UNCONFIRMED,
                reviewerId,
              },
            ],
          },
        },
      });
    });
  }
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const plan = await buildPlan();

  console.table(
    plan.map((item) => ({
      candidate: item.candidate,
      reviewer: item.reviewer,
      recordId: item.id,
      practice: item.practice,
      implementing: item.implementing,
      programming: item.programming,
      nonObservingIndividual: item.nonObservingIndividual,
    })),
  );

  const totalPractice = plan.reduce((sum, item) => sum + item.practice, 0);
  const totalSupervision = plan.reduce(
    (sum, item) => sum + item.nonObservingIndividual,
    0,
  );
  console.log(
    `${shouldApply ? 'Применение' : 'Dry-run'}: заявок ${plan.length}, ` +
      `практика ${totalPractice}, расчётная супервизия ${totalSupervision}.`,
  );

  if (!shouldApply) {
    console.log('Изменений в БД нет. Для применения запустите скрипт с --apply.');
    return;
  }

  await applyPlan(plan);
  const remaining = await buildPlan();
  if (remaining.length > 0) {
    throw new Error(`После применения осталось необработанных заявок: ${remaining.length}`);
  }
  console.log(`Преобразовано заявок: ${plan.length}. Повторный запуск изменений не создаст.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
