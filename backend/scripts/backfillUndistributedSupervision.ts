import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  CycleStatus,
  PracticeLevel,
  Prisma,
  RecordStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  addToNonObservingIndividual,
  EMPTY_SUPERVISION_DISTRIBUTION,
  planUndistributedSupervisionAllocation,
  roundSupervision,
  supervisionDistributionTotal,
  type SupervisionDistributionValues,
} from '../domain/supervision/undistributedSupervisionBackfill';
import { getCycleSupervisionTotals } from '../utils/getCycleSupervisionTotals';
import { getSupervisorBonusPracticeHours } from '../utils/getSupervisorBonusPracticeHours';

const PRACTICE_TYPES: PracticeLevel[] = [
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

type StorageTarget = {
  kind: 'LEGACY_DISTRIBUTION' | 'CONFIRMED_RECORD';
  id: string | null;
  before: SupervisionDistributionValues;
  after: SupervisionDistributionValues;
};

type BackfillPlanItem = {
  userId: string;
  email: string;
  fullName: string;
  cycleId: string;
  targetLevel: string;
  cycleType: string;
  confirmedPracticeRaw: number;
  bonusPractice: number;
  calculatedSupervision: number;
  distributedBefore: number;
  distributedAfter: number;
  addedNonObservingIndividual: number;
  effectiveBefore: SupervisionDistributionValues;
  effectiveAfter: SupervisionDistributionValues;
  storageTarget: StorageTarget;
};

type BackfillReport = {
  version: 1;
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  destination: 'Без наблюдения -> Индивидуально';
  fingerprint: string;
  candidates: number;
  totalAdded: number;
  postApplyRemaining: number | null;
  skippedAdminCorrections: Array<{
    email: string;
    cycleId: string;
    correctionId: string;
  }>;
  entries: BackfillPlanItem[];
};

type BackfillScan = {
  plan: BackfillPlanItem[];
  skippedAdminCorrections: BackfillReport['skippedAdminCorrections'];
};

function distributionFromNullable(value: {
  directIndividual: number | null;
  directGroup: number | null;
  nonObservingIndividual: number | null;
  nonObservingGroup: number | null;
} | null | undefined): SupervisionDistributionValues {
  return {
    directIndividual: value?.directIndividual ?? 0,
    directGroup: value?.directGroup ?? 0,
    nonObservingIndividual: value?.nonObservingIndividual ?? 0,
    nonObservingGroup: value?.nonObservingGroup ?? 0,
  };
}

function distributionFromRecord(value: {
  draftDirectIndividual: number | null;
  draftDirectGroup: number | null;
  draftNonObservingIndividual: number | null;
  draftNonObservingGroup: number | null;
}): SupervisionDistributionValues {
  return {
    directIndividual: value.draftDirectIndividual ?? 0,
    directGroup: value.draftDirectGroup ?? 0,
    nonObservingIndividual: value.draftNonObservingIndividual ?? 0,
    nonObservingGroup: value.draftNonObservingGroup ?? 0,
  };
}

function distributionRecordUpdate(distribution: SupervisionDistributionValues) {
  return {
    draftDirectIndividual: distribution.directIndividual,
    draftDirectGroup: distribution.directGroup,
    draftNonObservingIndividual: distribution.nonObservingIndividual,
    draftNonObservingGroup: distribution.nonObservingGroup,
  };
}

function sameNumber(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

function sameDistribution(
  left: SupervisionDistributionValues,
  right: SupervisionDistributionValues,
) {
  return (
    sameNumber(left.directIndividual, right.directIndividual) &&
    sameNumber(left.directGroup, right.directGroup) &&
    sameNumber(left.nonObservingIndividual, right.nonObservingIndividual) &&
    sameNumber(left.nonObservingGroup, right.nonObservingGroup)
  );
}

function reportPathFromArgs() {
  const raw = process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length);
  return raw ? resolve(raw) : null;
}

function expectedFingerprintFromArgs() {
  return process.argv
    .find((arg) => arg.startsWith('--expected-fingerprint='))
    ?.slice('--expected-fingerprint='.length);
}

function planFingerprint(plan: BackfillPlanItem[]) {
  const stable = plan.map((item) => ({
    email: item.email,
    cycleId: item.cycleId,
    confirmedPracticeRaw: item.confirmedPracticeRaw,
    bonusPractice: item.bonusPractice,
    calculatedSupervision: item.calculatedSupervision,
    distributedBefore: item.distributedBefore,
    addedNonObservingIndividual: item.addedNonObservingIndividual,
    storageTarget: item.storageTarget,
  }));
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

async function confirmedDistributionRecords(cycleId: string) {
  return prisma.supervisionRecord.findMany({
    where: {
      cycleId,
      hours: {
        some: {
          status: RecordStatus.CONFIRMED,
          type: { in: PRACTICE_TYPES },
        },
        every: { status: RecordStatus.CONFIRMED },
      },
    },
    select: {
      id: true,
      createdAt: true,
      draftDirectIndividual: true,
      draftDirectGroup: true,
      draftNonObservingIndividual: true,
      draftNonObservingGroup: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

async function buildPlan(): Promise<BackfillScan> {
  const cycles = await prisma.certificationCycle.findMany({
    where: {
      status: CycleStatus.ACTIVE,
      user: { archivedAt: null },
    },
    select: {
      id: true,
      userId: true,
      targetLevel: true,
      type: true,
      user: { select: { email: true, fullName: true } },
    },
    orderBy: [{ user: { email: 'asc' } }, { id: 'asc' }],
  });

  const plan: BackfillPlanItem[] = [];
  const skippedAdminCorrections: BackfillScan['skippedAdminCorrections'] = [];

  for (const cycle of cycles) {
    const bonusPractice = (await getSupervisorBonusPracticeHours(cycle.userId, cycle)).value;
    const totals = await getCycleSupervisionTotals(
      cycle.id,
      cycle.targetLevel,
      bonusPractice,
    );
    const [legacyDistribution, records] = await Promise.all([
      prisma.supervisionDistribution.findUnique({ where: { cycleId: cycle.id } }),
      confirmedDistributionRecords(cycle.id),
    ]);
    const confirmedDistribution = distributionFromNullable(
      totals.practiceDistributionConfirmed,
    );
    if (totals.adminCorrection) {
      skippedAdminCorrections.push({
        email: cycle.user.email,
        cycleId: cycle.id,
        correctionId: totals.adminCorrection.id,
      });
      continue;
    }
    const allocation = planUndistributedSupervisionAllocation({
      calculatedSupervision: totals.supervisionConfirmed,
      confirmedRecordDistribution: confirmedDistribution,
      legacyDistribution: distributionFromNullable(legacyDistribution),
      hasAdminCorrection: totals.adminCorrection !== null,
    });
    if (!allocation) continue;

    let storageTarget: StorageTarget;
    if (allocation.strategy === 'LEGACY_DISTRIBUTION') {
      const before = distributionFromNullable(legacyDistribution);
      storageTarget = {
        kind: 'LEGACY_DISTRIBUTION',
        id: legacyDistribution?.id ?? null,
        before,
        after: addToNonObservingIndividual(before, allocation.remainder),
      };
    } else {
      const targetRecord = records.find(
        (record) => supervisionDistributionTotal(distributionFromRecord(record)) > 0,
      );
      if (!targetRecord) {
        throw new Error(
          `${cycle.user.email}: распределение заявок есть, но целевая запись не найдена`,
        );
      }
      const before = distributionFromRecord(targetRecord);
      storageTarget = {
        kind: 'CONFIRMED_RECORD',
        id: targetRecord.id,
        before,
        after: addToNonObservingIndividual(before, allocation.remainder),
      };
    }

    plan.push({
      userId: cycle.userId,
      email: cycle.user.email,
      fullName: cycle.user.fullName,
      cycleId: cycle.id,
      targetLevel: cycle.targetLevel,
      cycleType: cycle.type,
      confirmedPracticeRaw: roundSupervision(totals.practiceConfirmedRaw),
      bonusPractice: roundSupervision(bonusPractice),
      calculatedSupervision: roundSupervision(totals.supervisionConfirmed),
      distributedBefore: supervisionDistributionTotal(allocation.effectiveBefore),
      distributedAfter: supervisionDistributionTotal(allocation.effectiveAfter),
      addedNonObservingIndividual: allocation.remainder,
      effectiveBefore: allocation.effectiveBefore,
      effectiveAfter: allocation.effectiveAfter,
      storageTarget,
    });
  }

  return { plan, skippedAdminCorrections };
}

async function assertConfirmedPracticeUnchanged(
  tx: Prisma.TransactionClient,
  item: BackfillPlanItem,
) {
  const confirmed = await tx.supervisionHour.aggregate({
    where: {
      status: RecordStatus.CONFIRMED,
      type: { in: PRACTICE_TYPES },
      record: { cycleId: item.cycleId },
    },
    _sum: { value: true },
  });
  const current = roundSupervision(confirmed._sum.value ?? 0);
  if (!sameNumber(current, item.confirmedPracticeRaw)) {
    throw new Error(`${item.email}: подтверждённая практика изменилась после dry-run`);
  }
}

async function applyPlan(plan: BackfillPlanItem[]) {
  await prisma.$transaction(
    async (tx) => {
      for (const item of plan) {
        const cycle = await tx.certificationCycle.findUnique({
          where: { id: item.cycleId },
          select: { status: true, targetLevel: true, type: true },
        });
        if (
          !cycle ||
          cycle.status !== CycleStatus.ACTIVE ||
          cycle.targetLevel !== item.targetLevel ||
          cycle.type !== item.cycleType
        ) {
          throw new Error(`${item.email}: активный цикл изменился после dry-run`);
        }

        const correction = await tx.supervisionAdminCorrection.findFirst({
          where: { cycleId: item.cycleId, kind: 'PRACTICE' },
          select: { id: true },
        });
        if (correction) {
          throw new Error(`${item.email}: после dry-run появилась админская корректировка`);
        }
        await assertConfirmedPracticeUnchanged(tx, item);

        if (item.storageTarget.kind === 'LEGACY_DISTRIBUTION') {
          const recordDistributions = await tx.supervisionRecord.findMany({
            where: {
              cycleId: item.cycleId,
              hours: {
                some: { status: RecordStatus.CONFIRMED, type: { in: PRACTICE_TYPES } },
                every: { status: RecordStatus.CONFIRMED },
              },
            },
            select: {
              draftDirectIndividual: true,
              draftDirectGroup: true,
              draftNonObservingIndividual: true,
              draftNonObservingGroup: true,
            },
          });
          const recordTotal = recordDistributions.reduce(
            (sum, record) =>
              sum + supervisionDistributionTotal(distributionFromRecord(record)),
            0,
          );
          if (!sameNumber(recordTotal, 0)) {
            throw new Error(`${item.email}: после dry-run появилось распределение в заявках`);
          }

          const current = await tx.supervisionDistribution.findUnique({
            where: { cycleId: item.cycleId },
          });
          if (!sameDistribution(distributionFromNullable(current), item.storageTarget.before)) {
            throw new Error(`${item.email}: старое распределение изменилось после dry-run`);
          }
          const updated = await tx.supervisionDistribution.upsert({
            where: { cycleId: item.cycleId },
            create: { cycleId: item.cycleId, ...item.storageTarget.after },
            update: item.storageTarget.after,
          });
          item.storageTarget.id = updated.id;
        } else {
          if (!item.storageTarget.id) {
            throw new Error(`${item.email}: не указана заявка для распределения`);
          }
          const record = await tx.supervisionRecord.findUnique({
            where: { id: item.storageTarget.id },
            select: {
              cycleId: true,
              draftDirectIndividual: true,
              draftDirectGroup: true,
              draftNonObservingIndividual: true,
              draftNonObservingGroup: true,
              hours: { select: { status: true, type: true } },
            },
          });
          const hasConfirmedPractice = record?.hours.some(
            (hour) =>
              hour.status === RecordStatus.CONFIRMED && PRACTICE_TYPES.includes(hour.type),
          );
          const allConfirmed = record?.hours.every(
            (hour) => hour.status === RecordStatus.CONFIRMED,
          );
          if (
            !record ||
            record.cycleId !== item.cycleId ||
            !hasConfirmedPractice ||
            !allConfirmed ||
            !sameDistribution(distributionFromRecord(record), item.storageTarget.before)
          ) {
            throw new Error(`${item.email}: выбранная подтверждённая заявка изменилась`);
          }
          await tx.supervisionRecord.update({
            where: { id: item.storageTarget.id },
            data: distributionRecordUpdate(item.storageTarget.after),
          });
        }
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 },
  );
}

function buildReport(params: {
  plan: BackfillPlanItem[];
  skippedAdminCorrections: BackfillReport['skippedAdminCorrections'];
  mode: 'dry-run' | 'apply';
  postApplyRemaining?: number;
  fingerprint?: string;
}): BackfillReport {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: params.mode,
    destination: 'Без наблюдения -> Индивидуально',
    fingerprint: params.fingerprint ?? planFingerprint(params.plan),
    candidates: params.plan.length,
    totalAdded: roundSupervision(
      params.plan.reduce((sum, item) => sum + item.addedNonObservingIndividual, 0),
    ),
    postApplyRemaining: params.postApplyRemaining ?? null,
    skippedAdminCorrections: params.skippedAdminCorrections,
    entries: params.plan,
  };
}

function writeReport(report: BackfillReport, path: string | null) {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Отчёт записан: ${path}`);
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const reportPath = reportPathFromArgs();
  const scan = await buildPlan();
  const { plan, skippedAdminCorrections } = scan;
  const fingerprint = planFingerprint(plan);

  console.table(
    plan.map((item) => ({
      email: item.email,
      calculated: item.calculatedSupervision,
      distributedBefore: item.distributedBefore,
      addNonObservingIndividual: item.addedNonObservingIndividual,
      storage: item.storageTarget.kind,
      recordId: item.storageTarget.id ?? 'new',
    })),
  );
  console.log(
    `${shouldApply ? 'Apply' : 'Dry-run'}: пользователей ${plan.length}, ` +
      `добавляется ${roundSupervision(
        plan.reduce((sum, item) => sum + item.addedNonObservingIndividual, 0),
      )} ч. в «Без наблюдения -> Индивидуально».`,
  );
  console.log(`Fingerprint: ${fingerprint}`);
  if (skippedAdminCorrections.length > 0) {
    console.warn(
      `Пропущено циклов с админской корректировкой: ${skippedAdminCorrections.length}. ` +
        'Они перечислены в отчёте и требуют отдельной проверки.',
    );
  }

  if (!shouldApply) {
    writeReport(
      buildReport({ plan, skippedAdminCorrections, mode: 'dry-run' }),
      reportPath,
    );
    console.log('Изменений в БД нет. Для применения нужен --apply и fingerprint dry-run.');
    return;
  }

  const expectedFingerprint = expectedFingerprintFromArgs();
  if (!expectedFingerprint || expectedFingerprint !== fingerprint) {
    throw new Error(
      'Apply отменён: передайте актуальный --expected-fingerprint из проверенного dry-run',
    );
  }
  if (plan.length === 0) {
    console.log('Нераспределённых часов нет, изменения не требуются.');
    writeReport(
      buildReport({
        plan,
        skippedAdminCorrections,
        mode: 'apply',
        postApplyRemaining: 0,
        fingerprint,
      }),
      reportPath,
    );
    return;
  }

  await applyPlan(plan);
  const remaining = await buildPlan();
  const report = buildReport({
    plan,
    skippedAdminCorrections,
    mode: 'apply',
    postApplyRemaining: remaining.plan.length,
    fingerprint,
  });
  writeReport(report, reportPath);
  if (remaining.plan.length > 0) {
    throw new Error(
      `После применения осталось нераспределённых профилей: ${remaining.plan.length}`,
    );
  }
  console.log(`Готово. Обработано профилей: ${plan.length}. Повторный dry-run должен быть пустым.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
