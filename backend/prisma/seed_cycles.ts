// prisma/seed_cycles.ts
import { PrismaClient, CycleStatus, CycleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { targetLevel: { not: null } },
    select: { id: true, targetLevel: true },
  });

  let ceuRecordsLinked = 0;
  let supervisionRecordsLinked = 0;

  for (const u of users) {
    const result = await prisma.$transaction(async (tx) => {
      let active = await tx.certificationCycle.findFirst({
        where: { userId: u.id, status: CycleStatus.ACTIVE },
        select: { id: true },
      });

      if (!active) {
        active = await tx.certificationCycle.create({
          data: {
            userId: u.id,
            targetLevel: u.targetLevel!,
            type: CycleType.CERTIFICATION,
            status: CycleStatus.ACTIVE,
          },
          select: { id: true },
        });
      }

      const ceuRes = await tx.cEURecord.updateMany({
        where: { userId: u.id, cycleId: null },
        data: { cycleId: active.id },
      });

      const supRes = await tx.supervisionRecord.updateMany({
        where: { userId: u.id, cycleId: null },
        data: { cycleId: active.id },
      });

      return { ceuLinked: ceuRes.count, supLinked: supRes.count };
    });

    ceuRecordsLinked += result.ceuLinked;
    supervisionRecordsLinked += result.supLinked;
  }

  const totalActiveCycles = await prisma.certificationCycle.count({
    where: { status: CycleStatus.ACTIVE },
  });

  console.log(
    JSON.stringify(
      {
        usersWithTargetLevel: users.length,
        totalActiveCycles,
        ceuRecordsLinked,
        supervisionRecordsLinked,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
