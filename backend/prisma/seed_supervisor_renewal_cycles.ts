// prisma/seed_supervisor_renewal_cycles.ts
import { PrismaClient, CycleStatus, CycleType, TargetLevel, RecordStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

type SupervisorGroupName = 'Супервизор' | 'Опытный Супервизор';

const SUPERVISOR_GROUPS: SupervisorGroupName[] = ['Супервизор', 'Опытный Супервизор'];

async function main() {
  console.log(`\n[seed_supervisor_renewal_cycles] start | dryRun=${DRY_RUN}\n`);

  const supervisorGroups = await prisma.group.findMany({
    where: { name: { in: SUPERVISOR_GROUPS } },
    select: { id: true, name: true },
  });

  const supervisorGroupIds = supervisorGroups.map((g) => g.id);

  if (!supervisorGroupIds.length) {
    throw new Error('Supervisor groups not found');
  }

  const users = await prisma.user.findMany({
    where: {
      groups: {
        some: {
          groupId: { in: supervisorGroupIds },
        },
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });

  let createdCycles = 0;
  let linkedCeuRecords = 0;
  let linkedSupervisionRecords = 0;

  let skippedNoCertificate = 0;
  let skippedHasActiveCycle = 0;
  let skippedNoEligibleRecords = 0;
  let skippedAlreadyLinkedAll = 0;

  for (const user of users) {
    const groupsSorted = user.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
    const activeGroupName = groupsSorted[0]?.name ?? null;

    if (!activeGroupName || !SUPERVISOR_GROUPS.includes(activeGroupName as SupervisorGroupName)) {
      continue;
    }

    const activeCycle = await prisma.certificationCycle.findFirst({
      where: {
        userId: user.id,
        status: CycleStatus.ACTIVE,
      },
      select: { id: true, type: true, targetLevel: true },
    });

    if (activeCycle) {
      skippedHasActiveCycle++;
      logSkip(user, `active cycle already exists (${activeCycle.type}/${activeCycle.targetLevel})`);
      continue;
    }

    // Последний сертификат в ветке супервизора:
    // и "Супервизор", и "Опытный Супервизор" считаем одной веткой.
    const lastCertificate = await prisma.certificate.findFirst({
      where: {
        userId: user.id,
        group: {
          name: { in: SUPERVISOR_GROUPS },
        },
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        issuedAt: true,
        expiresAt: true,
        group: { select: { name: true } },
      },
    });

    if (!lastCertificate) {
      skippedNoCertificate++;
      logSkip(user, 'no supervisor certificate in system');
      continue;
    }

    const issuedAt = lastCertificate.issuedAt;

    // Ищем только записи, созданные после даты последнего сертификата.
    // Берём только "живые" записи, которые ещё не привязаны к циклу.
    const ceuRecords = await prisma.cEURecord.findMany({
      where: {
        userId: user.id,
        cycleId: null,
        createdAt: { gt: issuedAt },
        entries: {
          some: {
            status: { in: [RecordStatus.CONFIRMED, RecordStatus.UNCONFIRMED] },
          },
        },
      },
      select: { id: true },
    });

    const supervisionRecords = await prisma.supervisionRecord.findMany({
      where: {
        userId: user.id,
        cycleId: null,
        createdAt: { gt: issuedAt },
        hours: {
          some: {
            status: { in: [RecordStatus.CONFIRMED, RecordStatus.UNCONFIRMED] },
          },
        },
      },
      select: { id: true },
    });

    const hasEligibleRecords = ceuRecords.length > 0 || supervisionRecords.length > 0;

    if (!hasEligibleRecords) {
      skippedNoEligibleRecords++;
      logSkip(user, 'no CEU/supervision records after last certificate');
      continue;
    }

    // На всякий случай: если всё уже куда-то привязано, не плодим цикл.
    const allAlreadyLinked =
      ceuRecords.length === 0 &&
      supervisionRecords.length === 0;

    if (allAlreadyLinked) {
      skippedAlreadyLinkedAll++;
      logSkip(user, 'all eligible records already linked');
      continue;
    }

    console.log(
      `[CREATE] ${user.fullName || user.email || user.id} | group=${activeGroupName} | certIssuedAt=${issuedAt.toISOString()} | ceu=${ceuRecords.length} | supervision=${supervisionRecords.length}`
    );

    if (DRY_RUN) {
      createdCycles++;
      linkedCeuRecords += ceuRecords.length;
      linkedSupervisionRecords += supervisionRecords.length;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.certificationCycle.create({
        data: {
          userId: user.id,
          targetLevel: TargetLevel.SUPERVISOR,
          type: CycleType.RENEWAL,
          status: CycleStatus.ACTIVE,
          startedAt: issuedAt,
          requirementsSnapshot: {
            source: 'seed_supervisor_renewal_cycles',
            lastCertificateId: lastCertificate.id,
            lastCertificateIssuedAt: issuedAt.toISOString(),
            lastCertificateGroup: lastCertificate.group.name,
          },
        },
        select: { id: true },
      });

      if (ceuRecords.length > 0) {
        const ceuRes = await tx.cEURecord.updateMany({
          where: {
            id: { in: ceuRecords.map((r) => r.id) },
            cycleId: null,
          },
          data: { cycleId: cycle.id },
        });
        linkedCeuRecords += ceuRes.count;
      }

      if (supervisionRecords.length > 0) {
        const supRes = await tx.supervisionRecord.updateMany({
          where: {
            id: { in: supervisionRecords.map((r) => r.id) },
            cycleId: null,
          },
          data: { cycleId: cycle.id },
        });
        linkedSupervisionRecords += supRes.count;
      }
    });

    createdCycles++;
  }

  console.log('\n[seed_supervisor_renewal_cycles] done\n');
  console.log({
    dryRun: DRY_RUN,
    createdCycles,
    linkedCeuRecords,
    linkedSupervisionRecords,
    skippedNoCertificate,
    skippedHasActiveCycle,
    skippedNoEligibleRecords,
    skippedAlreadyLinkedAll,
  });
}

function logSkip(
  user: { id: string; email: string; fullName: string | null },
  reason: string
) {
  console.log(`[SKIP] ${user.fullName || user.email || user.id} | ${reason}`);
}

main()
  .catch((err) => {
    console.error('\n[seed_supervisor_renewal_cycles] failed\n', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
