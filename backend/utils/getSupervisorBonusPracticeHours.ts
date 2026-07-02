import { CycleStatus, CycleType, TargetLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCycleSupervisionTotals } from './getCycleSupervisionTotals';
import { supervisionRequirementsByGroup } from './supervisionRequirements';

const CURATOR_GROUP_NAME = 'Куратор';
const CURATOR_BASE_PRACTICE_HOURS = supervisionRequirementsByGroup[CURATOR_GROUP_NAME].practice;

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
    const curatorLevelExists = await prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { groups: { some: { group: { name: CURATOR_GROUP_NAME } } } },
          { certificates: { some: { group: { name: CURATOR_GROUP_NAME } } } },
        ],
      },
      select: { id: true },
    });

    return {
      value: curatorLevelExists ? CURATOR_BASE_PRACTICE_HOURS : 0,
      sourceCycleId: null as string | null,
    };
  }

  const curatorTotals = await getCycleSupervisionTotals(
    lastCompletedCurator.id,
    TargetLevel.CURATOR,
    0,
  );

  return {
    value: Math.max(curatorTotals.practiceConfirmed, CURATOR_BASE_PRACTICE_HOURS),
    sourceCycleId: lastCompletedCurator.id,
  };
}
