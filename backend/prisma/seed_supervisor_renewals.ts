// prisma/seed_supervisor_renewals.ts
import {
  PrismaClient,
  CycleStatus,
  CycleType,
  PaymentStatus,
  PaymentType,
  TargetLevel,
} from '@prisma/client';

const prisma = new PrismaClient();

const SUPERVISOR_GROUPS = ['Супервизор', 'Опытный Супервизор'] as const;
const DRY_RUN = false;

type ProcessResult =
  | { kind: 'skipped'; email: string; reason: string }
  | {
    kind: 'processed';
    email: string;
    activeGroupName: string | null;
    lastCertificateIssuedAt: string;
    cycleId: string;
    ceuUpdated: number;
    supervisionUpdated: number;
    deletedRenewalPayments: number;
    createdRenewalPaymentId: string;
  };

async function processUser(userId: string): Promise<ProcessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      targetLevel: true,
      targetLockRank: true,
      groups: {
        select: {
          group: {
            select: {
              id: true,
              name: true,
              rank: true,
            },
          },
        },
      },
      certificates: {
        orderBy: {
          issuedAt: 'desc',
        },
        select: {
          id: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) {
    return { kind: 'skipped', email: `unknown:${userId}`, reason: 'USER_NOT_FOUND' };
  }

  const groupsSorted = [...user.groups].map((x) => x.group).sort((a, b) => b.rank - a.rank);

  const activeGroup = groupsSorted[0] ?? null;
  const activeGroupName = activeGroup?.name ?? null;
  const activeRank = activeGroup?.rank ?? null;

  const isSupervisor =
    activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';

  if (!isSupervisor) {
    return { kind: 'skipped', email: user.email, reason: 'NOT_SUPERVISOR' };
  }

  const lastCertificate = user.certificates[0];
  if (!lastCertificate) {
    return { kind: 'skipped', email: user.email, reason: 'NO_CERTIFICATE' };
  }

  const existingActiveCycle = await prisma.certificationCycle.findFirst({
    where: {
      userId: user.id,
      status: CycleStatus.ACTIVE,
    },
    select: {
      id: true,
      status: true,
      type: true,
      targetLevel: true,
    },
  });

  if (existingActiveCycle) {
    return {
      kind: 'skipped',
      email: user.email,
      reason: `ACTIVE_CYCLE_ALREADY_EXISTS:${existingActiveCycle.id}:${existingActiveCycle.type}:${existingActiveCycle.targetLevel}`,
    };
  }

  const issuedAt = new Date(lastCertificate.issuedAt);

  if (DRY_RUN) {
    const ceuCount = await prisma.cEURecord.count({
      where: {
        userId: user.id,
        createdAt: { gt: issuedAt },
      },
    });

    const supervisionCount = await prisma.supervisionRecord.count({
      where: {
        userId: user.id,
        createdAt: { gt: issuedAt },
      },
    });

    const renewalPaymentsCount = await prisma.payment.count({
      where: {
        userId: user.id,
        type: PaymentType.RENEWAL,
      },
    });

    return {
      kind: 'processed',
      email: user.email,
      activeGroupName,
      lastCertificateIssuedAt: issuedAt.toISOString(),
      cycleId: 'dry-run',
      ceuUpdated: ceuCount,
      supervisionUpdated: supervisionCount,
      deletedRenewalPayments: renewalPaymentsCount,
      createdRenewalPaymentId: 'dry-run',
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const cycle = await tx.certificationCycle.create({
      data: {
        userId: user.id,
        targetLevel: TargetLevel.SUPERVISOR,
        type: CycleType.RENEWAL,
        status: CycleStatus.ACTIVE,
        startedAt: issuedAt,
        requirementsSnapshot: {
          targetLevel: TargetLevel.SUPERVISOR,
          mode: 'RENEWAL',
          seeded: true,
          sourceCertificateIssuedAt: issuedAt.toISOString(),
        },
      },
      select: {
        id: true,
      },
    });

    const ceuRes = await tx.cEURecord.updateMany({
      where: {
        userId: user.id,
        createdAt: {
          gt: issuedAt,
        },
      },
      data: {
        cycleId: cycle.id,
      },
    });

    const supervisionRes = await tx.supervisionRecord.updateMany({
      where: {
        userId: user.id,
        createdAt: {
          gt: issuedAt,
        },
      },
      data: {
        cycleId: cycle.id,
      },
    });

    const deletedRenewalPayments = await tx.payment.deleteMany({
      where: {
        userId: user.id,
        type: PaymentType.RENEWAL,
      },
    });

    const renewalPayment = await tx.payment.create({
      data: {
        userId: user.id,
        type: PaymentType.RENEWAL,
        targetLevel: TargetLevel.SUPERVISOR,
        status: PaymentStatus.UNPAID,
        comment: 'Создано сидом ресертификации супервизоров',
      },
      select: {
        id: true,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        targetLevel: TargetLevel.SUPERVISOR,
        targetLockRank: activeRank,
      },
    });

    return {
      cycleId: cycle.id,
      ceuUpdated: ceuRes.count,
      supervisionUpdated: supervisionRes.count,
      deletedRenewalPayments: deletedRenewalPayments.count,
      createdRenewalPaymentId: renewalPayment.id,
    };
  });

  return {
    kind: 'processed',
    email: user.email,
    activeGroupName,
    lastCertificateIssuedAt: issuedAt.toISOString(),
    cycleId: result.cycleId,
    ceuUpdated: result.ceuUpdated,
    supervisionUpdated: result.supervisionUpdated,
    deletedRenewalPayments: result.deletedRenewalPayments,
    createdRenewalPaymentId: result.createdRenewalPaymentId,
  };
}

async function main() {
  const candidates = await prisma.user.findMany({
    where: {
      groups: {
        some: {
          group: {
            name: {
              in: [...SUPERVISOR_GROUPS],
            },
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  console.log(`\n[seed_supervisor_renewals] candidates: ${candidates.length}`);
  console.log(`[seed_supervisor_renewals] mode: ${DRY_RUN ? 'DRY_RUN' : 'WRITE'}\n`);

  const processed: ProcessResult[] = [];

  for (const candidate of candidates) {
    try {
      const res = await processUser(candidate.id);
      processed.push(res);

      if (res.kind === 'skipped') {
        console.log(`- SKIP  ${res.email} :: ${res.reason}`);
      } else {
        console.log(
          [
            `+ DONE  ${res.email}`,
            `group=${res.activeGroupName ?? '—'}`,
            `issuedAt=${res.lastCertificateIssuedAt}`,
            `cycle=${res.cycleId}`,
            `ceu=${res.ceuUpdated}`,
            `supervision=${res.supervisionUpdated}`,
            `renewalDeleted=${res.deletedRenewalPayments}`,
            `renewalCreated=${res.createdRenewalPaymentId}`,
          ].join(' | '),
        );
      }
    } catch (error) {
      console.error(`! FAIL  ${candidate.email}`, error);
      throw error;
    }
  }

  const summary = processed.reduce(
    (acc, item) => {
      if (item.kind === 'skipped') {
        acc.skipped += 1;
      } else {
        acc.processed += 1;
        acc.ceuUpdated += item.ceuUpdated;
        acc.supervisionUpdated += item.supervisionUpdated;
        acc.deletedRenewalPayments += item.deletedRenewalPayments;
      }
      return acc;
    },
    {
      processed: 0,
      skipped: 0,
      ceuUpdated: 0,
      supervisionUpdated: 0,
      deletedRenewalPayments: 0,
    },
  );

  console.log('\n[seed_supervisor_renewals] summary');
  console.log(summary);
  console.log('');
}

main()
  .catch((error) => {
    console.error('[seed_supervisor_renewals] fatal error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
