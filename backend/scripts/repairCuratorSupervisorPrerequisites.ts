import {
  CycleStatus,
  CycleType,
  PrismaClient,
  RecordStatus,
  SupervisionAdminCorrectionKind,
  TargetLevel,
} from '@prisma/client';
import { calcAutoSupervisionHours } from '../utils/supervisionRequirements';

const prisma = new PrismaClient();

const CURATOR_GROUP_NAME = 'Куратор';
const CURATOR_FLOOR_HOURS = 500;
const PRACTICE_TYPES = ['PRACTICE', 'IMPLEMENTING', 'PROGRAMMING'] as const;

function hasFlag(name: string) {
  return process.argv.includes(name);
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

function looksLikeCuratorCertificate(title: string | null | undefined, groupName: string | null | undefined) {
  return /куратор/i.test(title ?? '') || groupName === CURATOR_GROUP_NAME;
}

async function confirmedPracticeByCycle(cycleId: string) {
  const [correction, aggregate] = await Promise.all([
    prisma.supervisionAdminCorrection.findUnique({
      where: {
        cycleId_kind: {
          cycleId,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
        },
      },
      select: { implementing: true, programming: true },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        record: { cycleId },
        status: RecordStatus.CONFIRMED,
        type: { in: [...PRACTICE_TYPES] },
      },
      _sum: { value: true },
    }),
  ]);

  return correction
    ? round2(correction.implementing + correction.programming)
    : round2(aggregate._sum.value ?? 0);
}

async function ensureCuratorCorrection(cycleId: string, userId: string, apply: boolean) {
  const current = await confirmedPracticeByCycle(cycleId);
  if (current >= CURATOR_FLOOR_HOURS) {
    return { changed: false, current };
  }

  const split = splitPractice(CURATOR_FLOOR_HOURS);
  const supervision = calcAutoSupervisionHours({
    groupName: CURATOR_GROUP_NAME,
    practiceHours: CURATOR_FLOOR_HOURS,
  });

  if (apply) {
    await prisma.supervisionAdminCorrection.upsert({
      where: {
        cycleId_kind: {
          cycleId,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
        },
      },
      create: {
        userId,
        cycleId,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
        implementing: split.implementing,
        programming: split.programming,
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: supervision,
        nonObservingGroup: 0,
        notifyUser: false,
      },
      update: {
        implementing: split.implementing,
        programming: split.programming,
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: supervision,
        nonObservingGroup: 0,
        notifyUser: false,
      },
    });
  }

  return { changed: true, current };
}

async function main() {
  const apply = hasFlag('--apply');
  const curatorGroup = await prisma.group.findUnique({
    where: { name: CURATOR_GROUP_NAME },
    select: { id: true, name: true },
  });

  if (!curatorGroup) {
    throw new Error(`Group "${CURATOR_GROUP_NAME}" not found`);
  }

  const users = await prisma.user.findMany({
    where: {
      groups: { some: { group: { name: CURATOR_GROUP_NAME } } },
      cycles: {
        some: {
          status: CycleStatus.ACTIVE,
          type: CycleType.CERTIFICATION,
          targetLevel: TargetLevel.SUPERVISOR,
        },
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      cycles: {
        select: { id: true, targetLevel: true, status: true, type: true, startedAt: true },
        orderBy: { startedAt: 'desc' },
      },
      certificates: {
        select: {
          id: true,
          title: true,
          issuedAt: true,
          expiresAt: true,
          cycleId: true,
          group: { select: { id: true, name: true } },
        },
        orderBy: { issuedAt: 'desc' },
      },
    },
  });

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Curators with active supervisor cycle: ${users.length}`);
  console.log('');

  let fixedExistingCycles = 0;
  let createdCycles = 0;
  let fixedCertificateGroups = 0;
  let skipped = 0;

  for (const user of users) {
    const completedCuratorCycle = user.cycles.find(
      (cycle) => cycle.status === CycleStatus.COMPLETED && cycle.targetLevel === TargetLevel.CURATOR,
    );

    if (completedCuratorCycle) {
      const result = await ensureCuratorCorrection(completedCuratorCycle.id, user.id, apply);
      if (result.changed) {
        fixedExistingCycles += 1;
        console.log(
          `[${apply ? 'FIXED_EXISTING' : 'WOULD_FIX_EXISTING'}] ${user.email} | cycle=${completedCuratorCycle.id} | current=${result.current} -> ${CURATOR_FLOOR_HOURS}`,
        );
      } else {
        console.log(`[OK_EXISTING] ${user.email} | cycle=${completedCuratorCycle.id} | current=${result.current}`);
      }
      continue;
    }

    const curatorCertificate = user.certificates.find((certificate) =>
      looksLikeCuratorCertificate(certificate.title, certificate.group.name),
    );

    if (!curatorCertificate) {
      skipped += 1;
      console.log(`[SKIP_NO_CURATOR_CERT] ${user.email} | ${user.fullName ?? '-'}`);
      continue;
    }

    const shouldFixCertificateGroup = curatorCertificate.group.name !== CURATOR_GROUP_NAME;
    const cycleDate = curatorCertificate.issuedAt;

    console.log(
      `[${apply ? 'CREATE_FROM_CERT' : 'WOULD_CREATE_FROM_CERT'}] ${user.email} | cert=${curatorCertificate.id} | title=${curatorCertificate.title} | certGroup=${curatorCertificate.group.name} | date=${cycleDate.toISOString().slice(0, 10)}`,
    );

    if (apply) {
      await prisma.$transaction(async (tx) => {
        const cycle = await tx.certificationCycle.create({
          data: {
            userId: user.id,
            targetLevel: TargetLevel.CURATOR,
            type: CycleType.CERTIFICATION,
            status: CycleStatus.COMPLETED,
            startedAt: cycleDate,
            endedAt: cycleDate,
          },
          select: { id: true },
        });

        await tx.certificate.update({
          where: { id: curatorCertificate.id },
          data: {
            cycleId: cycle.id,
            ...(shouldFixCertificateGroup ? { groupId: curatorGroup.id } : {}),
          },
        });

        const split = splitPractice(CURATOR_FLOOR_HOURS);
        await tx.supervisionAdminCorrection.create({
          data: {
            userId: user.id,
            cycleId: cycle.id,
            kind: SupervisionAdminCorrectionKind.PRACTICE,
            implementing: split.implementing,
            programming: split.programming,
            directIndividual: 0,
            directGroup: 0,
            nonObservingIndividual: calcAutoSupervisionHours({
              groupName: CURATOR_GROUP_NAME,
              practiceHours: CURATOR_FLOOR_HOURS,
            }),
            nonObservingGroup: 0,
            notifyUser: false,
          },
        });
      });
    }

    createdCycles += 1;
    if (shouldFixCertificateGroup) {
      fixedCertificateGroups += 1;
    }
  }

  console.log('');
  console.log(`Existing curator cycles fixed: ${fixedExistingCycles}`);
  console.log(`Completed curator cycles created from certificates: ${createdCycles}`);
  console.log(`Certificate groups fixed: ${fixedCertificateGroups}`);
  console.log(`Skipped: ${skipped}`);
  console.log(apply ? 'Done.' : 'Dry-run only. Re-run with --apply to write changes.');
}

main()
  .catch((error) => {
    console.error('Curator/supervisor prerequisite repair failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
