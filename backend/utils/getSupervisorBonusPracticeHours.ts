import { CycleStatus, CycleType, TargetLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCycleSupervisionTotals } from './getCycleSupervisionTotals';

type ActiveCycleLike = {
  targetLevel: TargetLevel;
  type?: CycleType | null;
};

export async function getSupervisorBonusPracticeHours(
  userId: string,
  activeCycle: ActiveCycleLike,
) {
  if (
    activeCycle.type === CycleType.RENEWAL ||
    activeCycle.targetLevel !== TargetLevel.SUPERVISOR
  ) {
    return { value: 0, sourceCycleId: null as string | null };
  }

  const lastCompletedCurator = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.COMPLETED,
      targetLevel: TargetLevel.CURATOR,
    },
    orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
    select: { id: true },
  });

  if (!lastCompletedCurator) {
    return { value: 0, sourceCycleId: null as string | null };
  }

  const curatorTotals = await getCycleSupervisionTotals(
    lastCompletedCurator.id,
    TargetLevel.CURATOR,
    0,
  );

  return {
    value: curatorTotals.practiceConfirmed,
    sourceCycleId: lastCompletedCurator.id,
  };
}
