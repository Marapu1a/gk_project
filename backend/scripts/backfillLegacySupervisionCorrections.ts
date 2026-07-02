import {
  CycleStatus,
  CycleType,
  PracticeLevel,
  Prisma,
  PrismaClient,
  RecordStatus,
  SupervisionAdminCorrectionKind,
  TargetLevel,
} from '@prisma/client';
import {
  calcAutoRenewalSupervisionHours,
  calcAutoSupervisionHours,
  supervisionRequirementsByGroup,
} from '../utils/supervisionRequirements';
import { targetLevelToGroupName } from '../domain/levels';

const prisma = new PrismaClient();

const PRACTICE_TYPES = [
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
] as const;

const MENTORSHIP_TYPES = [
  PracticeLevel.SUPERVISOR,
  PracticeLevel.SUPERVISION,
] as const;

type CycleCandidate = {
  userId: string;
  email: string;
  fullName: string | null;
  cycleId: string;
  cycleStatus: CycleStatus;
  cycleType: CycleType;
  targetLevel: TargetLevel;
  practice: number;
  supervision: number;
  implementing: number;
  programming: number;
  source: 'legacy-hours' | 'legacy-hours-minus-curator-bonus' | 'curator-floor';
  legacyPractice: number;
  curatorBonus: number;
};

type CuratorBonusWarning = {
  userId: string;
  email: string;
  fullName: string | null;
  cycleId: string;
  currentGroup: string | null;
  bonusPractice: number;
  completedCuratorCycleId: string | null;
  reason: string;
};

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function limitFromArgs() {
  const raw = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function splitPractice(total: number) {
  const implementing = round2(total / 2);
  return {
    implementing,
    programming: round2(total - implementing),
  };
}

function calcSupervision(targetLevel: TargetLevel, cycleType: CycleType, practice: number) {
  const groupName = targetLevelToGroupName(targetLevel);
  return round2(
    cycleType === CycleType.RENEWAL
      ? calcAutoRenewalSupervisionHours({ groupName, practiceHours: practice })
      : calcAutoSupervisionHours({ groupName, practiceHours: practice }),
  );
}

function formatCandidate(candidate: CycleCandidate) {
  return [
    candidate.email,
    candidate.fullName ?? '-',
    `cycle=${candidate.cycleId}`,
    `cycleStatus=${candidate.cycleStatus}`,
    `type=${candidate.cycleType}`,
    `target=${candidate.targetLevel}`,
    `source=${candidate.source}`,
    `legacyPractice=${candidate.legacyPractice}`,
    `curatorBonus=${candidate.curatorBonus}`,
    `practice=${candidate.practice}`,
    `split=${candidate.implementing}/${candidate.programming}`,
    `supervision=${candidate.supervision}`,
  ].join(' | ');
}

function currentGroupName(
  groups: Array<{ group: { name: string; rank: number } }>,
) {
  return groups
    .map((item) => item.group)
    .sort((a, b) => b.rank - a.rank)[0]?.name ?? null;
}

async function confirmedPracticeByCycle(cycleId: string, tx: Prisma.TransactionClient | PrismaClient = prisma) {
  const aggregate = await tx.supervisionHour.aggregate({
    where: {
      record: { cycleId },
      status: RecordStatus.CONFIRMED,
      type: { in: [...PRACTICE_TYPES] },
    },
    _sum: { value: true },
  });

  return round2(aggregate._sum.value ?? 0);
}

async function hasPracticeCorrection(cycleId: string) {
  const correction = await prisma.supervisionAdminCorrection.findUnique({
    where: {
      cycleId_kind: {
        cycleId,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
      },
    },
    select: { id: true },
  });

  return Boolean(correction);
}

async function getPracticeCorrection(cycleId: string) {
  return prisma.supervisionAdminCorrection.findUnique({
    where: {
      cycleId_kind: {
        cycleId,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
      },
    },
    select: { id: true, adminId: true, notifyUser: true },
  });
}

async function getCompletedCuratorBonus(userId: string) {
  const completedCurator = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.COMPLETED,
      targetLevel: TargetLevel.CURATOR,
    },
    orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
    select: { id: true },
  });

  if (!completedCurator) {
    return { value: 0, sourceCycleId: null as string | null };
  }

  const correction = await prisma.supervisionAdminCorrection.findUnique({
    where: {
      cycleId_kind: {
        cycleId: completedCurator.id,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
      },
    },
    select: { implementing: true, programming: true },
  });

  if (correction) {
    return {
      value: round2(correction.implementing + correction.programming),
      sourceCycleId: completedCurator.id,
    };
  }

  return {
    value: await confirmedPracticeByCycle(completedCurator.id),
    sourceCycleId: completedCurator.id,
  };
}

async function collectCycleCandidates(): Promise<CycleCandidate[]> {
  const recalculateExistingAutoCorrections = hasFlag('--recalculate-existing-auto');
  const cycles = await prisma.certificationCycle.findMany({
    where: {
      OR: [
        { status: CycleStatus.ACTIVE },
        { status: CycleStatus.COMPLETED, targetLevel: TargetLevel.CURATOR },
      ],
    },
    orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
    select: {
      id: true,
      userId: true,
      status: true,
      type: true,
      targetLevel: true,
      user: { select: { email: true, fullName: true } },
    },
  });

  const candidates: CycleCandidate[] = [];

  for (const cycle of cycles) {
    const existingCorrection = await getPracticeCorrection(cycle.id);
    if (existingCorrection && !recalculateExistingAutoCorrections) continue;
    if (existingCorrection?.adminId && recalculateExistingAutoCorrections) continue;

    const legacyPractice = await confirmedPracticeByCycle(cycle.id);
    let practice = legacyPractice;
    let curatorBonus = 0;
    let curatorBonusSubtracted = false;

    if (
      cycle.status === CycleStatus.ACTIVE &&
      cycle.type === CycleType.CERTIFICATION &&
      cycle.targetLevel === TargetLevel.SUPERVISOR
    ) {
      const bonus = await getCompletedCuratorBonus(cycle.userId);
      curatorBonus = bonus.value;
      const requiredPractice =
        supervisionRequirementsByGroup[targetLevelToGroupName(cycle.targetLevel)].practice;

      if (legacyPractice >= requiredPractice) {
        practice = Math.max(0, round2(legacyPractice - curatorBonus));
        curatorBonusSubtracted = curatorBonus > 0;
      }
    }

    if (practice <= 0) continue;

    const split = splitPractice(practice);
    candidates.push({
      userId: cycle.userId,
      email: cycle.user.email,
      fullName: cycle.user.fullName,
      cycleId: cycle.id,
      cycleStatus: cycle.status,
      cycleType: cycle.type,
      targetLevel: cycle.targetLevel,
      practice,
      supervision: calcSupervision(cycle.targetLevel, cycle.type, practice),
      implementing: split.implementing,
      programming: split.programming,
      source: curatorBonusSubtracted ? 'legacy-hours-minus-curator-bonus' : 'legacy-hours',
      legacyPractice,
      curatorBonus,
    });
  }

  return candidates;
}

async function collectCuratorBonusWarnings(): Promise<CuratorBonusWarning[]> {
  const activeSupervisorCycles = await prisma.certificationCycle.findMany({
    where: {
      status: CycleStatus.ACTIVE,
      type: CycleType.CERTIFICATION,
      targetLevel: TargetLevel.SUPERVISOR,
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
          fullName: true,
          groups: { select: { group: { select: { name: true, rank: true } } } },
        },
      },
    },
  });

  const warnings: CuratorBonusWarning[] = [];

  for (const cycle of activeSupervisorCycles) {
    const currentGroup = currentGroupName(cycle.user.groups);
    if (currentGroup !== 'Куратор') continue;

    const bonus = await getCompletedCuratorBonus(cycle.userId);
    if (bonus.value >= 500) continue;

    warnings.push({
      userId: cycle.userId,
      email: cycle.user.email,
      fullName: cycle.user.fullName,
      cycleId: cycle.id,
      currentGroup,
      bonusPractice: bonus.value,
      completedCuratorCycleId: bonus.sourceCycleId,
      reason: bonus.sourceCycleId
        ? 'completed curator cycle has less than 500 confirmed/corrected practice hours'
        : 'completed curator cycle not found',
    });
  }

  return warnings;
}

async function createCompletedCuratorCycleWithFloor(warning: CuratorBonusWarning) {
  const activeCycle = await prisma.certificationCycle.findUnique({
    where: { id: warning.cycleId },
    select: { startedAt: true },
  });
  if (!activeCycle) {
    console.log(`[SKIP_ACTIVE_CYCLE_NOT_FOUND] ${warning.email} | activeCycle=${warning.cycleId}`);
    return;
  }

  const baseDate = new Date(activeCycle.startedAt.getTime() - 1000);
  const split = splitPractice(500);

  const created = await prisma.$transaction(async (tx) => {
    const cycle = await tx.certificationCycle.create({
      data: {
        userId: warning.userId,
        targetLevel: TargetLevel.CURATOR,
        type: CycleType.CERTIFICATION,
        status: CycleStatus.COMPLETED,
        startedAt: baseDate,
        endedAt: baseDate,
      },
      select: { id: true },
    });

    await tx.supervisionAdminCorrection.create({
      data: {
        userId: warning.userId,
        cycleId: cycle.id,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
        implementing: split.implementing,
        programming: split.programming,
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: calcSupervision(TargetLevel.CURATOR, CycleType.CERTIFICATION, 500),
        nonObservingGroup: 0,
        notifyUser: false,
      },
    });

    return cycle;
  });

  console.log(`[MISSING_CURATOR_CYCLE_CREATED] ${warning.email} | cycle=${created.id} | practice=500`);
}

async function main() {
  const apply = hasFlag('--apply');
  const fixCuratorFloor = hasFlag('--fix-curator-floor');
  const createMissingCuratorCycles = hasFlag('--create-missing-curator-cycles');
  const limit = limitFromArgs();

  const candidates = await collectCycleCandidates();
  const selected = limit ? candidates.slice(0, limit) : candidates;
  const curatorWarningsBefore = await collectCuratorBonusWarnings();

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Practice correction candidates: ${candidates.length}`);
  console.log(`Selected by limit: ${selected.length}`);
  console.log(`Curator -> Supervisor bonus warnings before apply: ${curatorWarningsBefore.length}`);
  console.log(`Fix curator floor: ${fixCuratorFloor ? 'yes' : 'no'}`);
  console.log(`Create missing curator cycles: ${createMissingCuratorCycles ? 'yes' : 'no'}`);
  console.log('');

  for (const candidate of selected) {
    console.log(`${apply ? '[UPSERT_CORRECTION]' : '[WOULD_UPSERT_CORRECTION]'} ${formatCandidate(candidate)}`);

    if (!apply) continue;

    await prisma.supervisionAdminCorrection.upsert({
      where: {
        cycleId_kind: {
          cycleId: candidate.cycleId,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
        },
      },
      create: {
        userId: candidate.userId,
        cycleId: candidate.cycleId,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
        implementing: candidate.implementing,
        programming: candidate.programming,
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: candidate.supervision,
        nonObservingGroup: 0,
        notifyUser: false,
      },
      update: {
        implementing: candidate.implementing,
        programming: candidate.programming,
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: candidate.supervision,
        nonObservingGroup: 0,
        notifyUser: false,
      },
    });
  }

  const curatorWarningsAfterCorrections = apply ? await collectCuratorBonusWarnings() : curatorWarningsBefore;
  console.log('');
  console.log(`Curator -> Supervisor bonus warnings after normal corrections: ${curatorWarningsAfterCorrections.length}`);

  for (const warning of curatorWarningsAfterCorrections) {
    console.log(
      `[CURATOR_BONUS_WARNING] ${warning.email} | ${warning.fullName ?? '-'} | ` +
      `activeCycle=${warning.cycleId} | completedCuratorCycle=${warning.completedCuratorCycleId ?? '-'} | ` +
      `bonus=${warning.bonusPractice} | ${warning.reason}`,
    );
  }

  if (apply && fixCuratorFloor) {
    console.log('');
    console.log('Applying curator floor corrections...');

    for (const warning of curatorWarningsAfterCorrections) {
      const targetCycleId = warning.completedCuratorCycleId;
      if (!targetCycleId) {
        if (createMissingCuratorCycles) {
          await createCompletedCuratorCycleWithFloor(warning);
        } else {
          console.log(
            `[SKIP_NO_COMPLETED_CURATOR_CYCLE] ${warning.email} | activeCycle=${warning.cycleId}`,
          );
        }
        continue;
      }

      const split = splitPractice(500);
      await prisma.supervisionAdminCorrection.upsert({
        where: {
          cycleId_kind: {
            cycleId: targetCycleId,
            kind: SupervisionAdminCorrectionKind.PRACTICE,
          },
        },
        create: {
          userId: warning.userId,
          cycleId: targetCycleId,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
          implementing: split.implementing,
          programming: split.programming,
          directIndividual: 0,
          directGroup: 0,
          nonObservingIndividual: calcSupervision(TargetLevel.CURATOR, CycleType.CERTIFICATION, 500),
          nonObservingGroup: 0,
          notifyUser: false,
        },
        update: {
          implementing: split.implementing,
          programming: split.programming,
          directIndividual: 0,
          directGroup: 0,
          nonObservingIndividual: calcSupervision(TargetLevel.CURATOR, CycleType.CERTIFICATION, 500),
          nonObservingGroup: 0,
          notifyUser: false,
        },
      });

      console.log(`[CURATOR_FLOOR_FIXED] ${warning.email} | cycle=${targetCycleId} | practice=500`);
    }
  }

  const curatorWarningsFinal = apply ? await collectCuratorBonusWarnings() : curatorWarningsBefore;

  console.log('');
  console.log(`Curator -> Supervisor bonus warnings final: ${curatorWarningsFinal.length}`);
  console.log(apply ? 'Done.' : 'Dry-run only. Re-run with --apply to write changes.');
  if (!apply && curatorWarningsBefore.length > 0) {
    console.log(
      'Tip: after reviewing warnings, use --apply --fix-curator-floor to force completed curator cycles with existing source cycles to 500.',
    );
    console.log(
      'Tip: add --create-missing-curator-cycles to create service completed curator cycles for current curators without such a cycle.',
    );
  }
}

main()
  .catch((error) => {
    console.error('Legacy supervision correction backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
