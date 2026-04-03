// src/handlers/supervision/supervisionSummary.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, CycleStatus, TargetLevel, CycleType } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  renewalSupervisionRequirementsByGroup,
} from '../../utils/supervisionRequirements';
import { getCycleSupervisionTotals } from '../../utils/getCycleSupervisionTotals';

type SummaryTotals = {
  practice: number;
  supervision: number;
  supervisor: number; // менторские часы
};

type PracticeBreakdown = {
  total: number;
  legacy: number;
  implementing: number;
  programming: number;
  bonus: number;
};

type PendingPracticeBreakdown = {
  total: number;
  legacy: number;
  implementing: number;
  programming: number;
};

type Distribution = {
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
};

type SupervisionBreakdown = {
  total: number;
  direct: number;
  nonObserving: number;
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
  distributedTotal: number;
  remaining: number;
};

type PracticeAgg = {
  legacy: number;
  implementing: number;
  programming: number;
  supervisor: number;
};

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export async function supervisionSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });

  if (!activeCycle) {
    return reply.send({
      required: null,
      percent: null,
      usable: emptyTotals(),
      pending: emptyTotals(),
      mentor: null,
      bonus: null,
      distribution: null,
      practiceBreakdown: emptyPracticeBreakdown(),
      pendingPracticeBreakdown: emptyPendingPracticeBreakdown(),
      supervisionBreakdown: emptySupervisionBreakdown(),
    });
  }

  const groups = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const current = groups[0]?.name;

  if (!current) {
    return reply.send({
      required: null,
      percent: null,
      usable: emptyTotals(),
      pending: emptyTotals(),
      mentor: null,
      bonus: null,
      distribution: null,
      practiceBreakdown: emptyPracticeBreakdown(),
      pendingPracticeBreakdown: emptyPendingPracticeBreakdown(),
      supervisionBreakdown: emptySupervisionBreakdown(),
    });
  }

  const targetRu = RU_BY_LEVEL[activeCycle.targetLevel];
  const isRenewal = activeCycle.type === CycleType.RENEWAL;

  const reqSet = isRenewal
    ? renewalSupervisionRequirementsByGroup[targetRu] ?? null
    : supervisionRequirementsByGroup[targetRu] ?? null;

  const shouldShowMentor = isRenewal
    ? activeCycle.targetLevel === TargetLevel.SUPERVISOR
    : current === 'Супервизор';

  const practiceTypes = [
    PracticeLevel.PRACTICE,
    PracticeLevel.IMPLEMENTING,
    PracticeLevel.PROGRAMMING,
  ];

  const [confirmed, unconfirmed, rawDistribution] = await Promise.all([
    prisma.supervisionHour.findMany({
      where: {
        status: 'CONFIRMED',
        type: { in: [...practiceTypes, PracticeLevel.SUPERVISOR] },
        record: { cycleId: activeCycle.id },
      },
      select: { type: true, value: true },
    }),
    prisma.supervisionHour.findMany({
      where: {
        status: 'UNCONFIRMED',
        type: { in: [...practiceTypes, PracticeLevel.SUPERVISOR] },
        record: { cycleId: activeCycle.id },
      },
      select: { type: true, value: true },
    }),
    prisma.supervisionDistribution.findUnique({
      where: { cycleId: activeCycle.id },
      select: {
        directIndividual: true,
        directGroup: true,
        nonObservingIndividual: true,
        nonObservingGroup: true,
      },
    }),
  ]);

  const usableAgg = aggregate(confirmed);
  const pendingAgg = aggregate(unconfirmed);

  let bonusPractice = 0;
  let bonusSourceCycleId: string | null = null;

  if (!isRenewal && activeCycle.targetLevel === TargetLevel.SUPERVISOR) {
    const lastCompletedCurator = await prisma.certificationCycle.findFirst({
      where: {
        userId: user.userId,
        status: CycleStatus.COMPLETED,
        targetLevel: TargetLevel.CURATOR,
      },
      orderBy: { endedAt: 'desc' },
      select: { id: true },
    });

    if (lastCompletedCurator) {
      const bonusAgg = await prisma.supervisionHour.aggregate({
        where: {
          status: 'CONFIRMED',
          type: { in: practiceTypes },
          record: { cycleId: lastCompletedCurator.id },
        },
        _sum: { value: true },
      });

      bonusPractice = bonusAgg._sum.value ?? 0;
      bonusSourceCycleId = lastCompletedCurator.id;
    }
  }

  const cycleTotals = await getCycleSupervisionTotals(
    activeCycle.id,
    activeCycle.targetLevel,
    bonusPractice
  );

  const usable: SummaryTotals = {
    practice: cycleTotals.practiceConfirmed,
    supervision: cycleTotals.supervisionConfirmed,
    supervisor: usableAgg.supervisor,
  };

  const pending: SummaryTotals = {
    practice: cycleTotals.practicePending,
    supervision: cycleTotals.supervisionPending,
    supervisor: pendingAgg.supervisor,
  };

  const practiceBreakdown: PracticeBreakdown = {
    total: cycleTotals.practiceConfirmed,
    legacy: usableAgg.legacy,
    implementing: usableAgg.implementing,
    programming: usableAgg.programming,
    bonus: bonusPractice,
  };

  const pendingPracticeBreakdown: PendingPracticeBreakdown = {
    total: cycleTotals.practicePending,
    legacy: pendingAgg.legacy,
    implementing: pendingAgg.implementing,
    programming: pendingAgg.programming,
  };

  const distribution: Distribution | null = rawDistribution
    ? {
      directIndividual: rawDistribution.directIndividual,
      directGroup: rawDistribution.directGroup,
      nonObservingIndividual: rawDistribution.nonObservingIndividual,
      nonObservingGroup: rawDistribution.nonObservingGroup,
    }
    : null;

  const directIndividual = distribution?.directIndividual ?? 0;
  const directGroup = distribution?.directGroup ?? 0;
  const nonObservingIndividual = distribution?.nonObservingIndividual ?? 0;
  const nonObservingGroup = distribution?.nonObservingGroup ?? 0;

  const direct = directIndividual + directGroup;
  const nonObserving = nonObservingIndividual + nonObservingGroup;
  const distributedTotal = direct + nonObserving;

  const supervisionBreakdown: SupervisionBreakdown = {
    total: cycleTotals.supervisionConfirmed,
    direct,
    nonObserving,
    directIndividual,
    directGroup,
    nonObservingIndividual,
    nonObservingGroup,
    distributedTotal,
    remaining: Math.max(0, cycleTotals.supervisionConfirmed - distributedTotal),
  };

  if (!reqSet) {
    const mentor = shouldShowMentor ? calcMentor(usable, pending, 24) : null;

    return reply.send({
      required: null,
      percent: null,
      usable,
      pending,
      mentor,
      bonus: bonusPractice > 0 ? { practice: bonusPractice, fromCycleId: bonusSourceCycleId } : null,
      distribution,
      practiceBreakdown,
      pendingPracticeBreakdown,
      supervisionBreakdown,
    });
  }

  const percent = {
    practice:
      reqSet.practice > 0
        ? Math.floor((Math.min(usable.practice, reqSet.practice) / reqSet.practice) * 100)
        : 0,
    supervision:
      reqSet.supervision > 0
        ? Math.floor((Math.min(usable.supervision, reqSet.supervision) / reqSet.supervision) * 100)
        : 0,
    supervisor:
      reqSet.supervisor > 0
        ? Math.floor((Math.min(usable.supervisor, reqSet.supervisor) / reqSet.supervisor) * 100)
        : 0,
  };

  const mentor = shouldShowMentor && reqSet.supervisor > 0
    ? calcMentor(usable, pending, reqSet.supervisor)
    : null;

  return reply.send({
    required: reqSet,
    percent,
    usable,
    pending,
    mentor,
    bonus: bonusPractice > 0 ? { practice: bonusPractice, fromCycleId: bonusSourceCycleId } : null,
    distribution,
    practiceBreakdown,
    pendingPracticeBreakdown,
    supervisionBreakdown,
  });
}

// ================= helpers ==================

function emptyTotals(): SummaryTotals {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

function emptyPracticeBreakdown(): PracticeBreakdown {
  return {
    total: 0,
    legacy: 0,
    implementing: 0,
    programming: 0,
    bonus: 0,
  };
}

function emptyPendingPracticeBreakdown(): PendingPracticeBreakdown {
  return {
    total: 0,
    legacy: 0,
    implementing: 0,
    programming: 0,
  };
}

function emptySupervisionBreakdown(): SupervisionBreakdown {
  return {
    total: 0,
    direct: 0,
    nonObserving: 0,
    directIndividual: 0,
    directGroup: 0,
    nonObservingIndividual: 0,
    nonObservingGroup: 0,
    distributedTotal: 0,
    remaining: 0,
  };
}

function aggregate(rows: Array<{ type: PracticeLevel; value: number }>): PracticeAgg {
  const s: PracticeAgg = {
    legacy: 0,
    implementing: 0,
    programming: 0,
    supervisor: 0,
  };

  for (const h of rows) {
    if (h.type === PracticeLevel.PRACTICE) s.legacy += h.value;
    if (h.type === PracticeLevel.IMPLEMENTING) s.implementing += h.value;
    if (h.type === PracticeLevel.PROGRAMMING) s.programming += h.value;
    if (h.type === PracticeLevel.SUPERVISOR) s.supervisor += h.value;
  }

  return s;
}

function calcMentor(usable: SummaryTotals, pending: SummaryTotals, requiredTotal: number) {
  const total = usable.supervisor;
  const percent = requiredTotal > 0 ? Math.floor((Math.min(total, requiredTotal) / requiredTotal) * 100) : 0;
  return { total, required: requiredTotal, percent, pending: pending.supervisor };
}
