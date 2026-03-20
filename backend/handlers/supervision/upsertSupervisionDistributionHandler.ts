// src/handlers/supervision/upsertSupervisionDistributionHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { CycleStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  supervisionDistributionSchema,
  SupervisionDistributionInput,
} from '../../schemas/supervisionDistributionSchema';
import { getCycleSupervisionTotals } from '../../utils/getCycleSupervisionTotals';

export async function upsertSupervisionDistributionHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.user?.userId;

  if (!userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const parsed = supervisionDistributionSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Неверные данные',
      details: parsed.error.flatten(),
    });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.ACTIVE,
    },
    select: {
      id: true,
      targetLevel: true,
    },
  });

  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const bonusPractice = await getBonusPracticeHours(userId, activeCycle.targetLevel);

  const cycleTotals = await getCycleSupervisionTotals(
    activeCycle.id,
    activeCycle.targetLevel,
    bonusPractice
  );

  const payload = normalize(parsed.data);
  const distributedTotal =
    payload.directIndividual +
    payload.directGroup +
    payload.nonObservingIndividual +
    payload.nonObservingGroup;

  const availableSupervision = cycleTotals.supervisionConfirmed;

  if (!isSameFloat(distributedTotal, availableSupervision)) {
    return reply.code(400).send({
      error: 'INVALID_DISTRIBUTION_SUM',
      message: 'Сумма распределения должна быть равна доступной супервизии',
      details: {
        availableSupervision,
        distributedTotal,
        difference: round2(distributedTotal - availableSupervision),
      },
    });
  }

  const distribution = await prisma.supervisionDistribution.upsert({
    where: {
      cycleId: activeCycle.id,
    },
    update: payload,
    create: {
      cycleId: activeCycle.id,
      ...payload,
    },
  });

  return reply.send({
    success: true,
    distribution,
  });
}

async function getBonusPracticeHours(userId: string, targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR') {
  if (targetLevel !== 'SUPERVISOR') return 0;

  const lastCompletedCurator = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.COMPLETED,
      targetLevel: 'CURATOR',
    },
    orderBy: {
      endedAt: 'desc',
    },
    select: {
      id: true,
    },
  });

  if (!lastCompletedCurator) return 0;

  const practiceTypes = ['PRACTICE', 'IMPLEMENTING', 'PROGRAMMING'] as const;

  const bonusAgg = await prisma.supervisionHour.aggregate({
    where: {
      status: 'CONFIRMED',
      type: { in: [...practiceTypes] },
      record: { cycleId: lastCompletedCurator.id },
    },
    _sum: {
      value: true,
    },
  });

  return bonusAgg._sum.value ?? 0;
}

function normalize(data: SupervisionDistributionInput): SupervisionDistributionInput {
  return {
    directIndividual: round2(data.directIndividual),
    directGroup: round2(data.directGroup),
    nonObservingIndividual: round2(data.nonObservingIndividual),
    nonObservingGroup: round2(data.nonObservingGroup),
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isSameFloat(a: number, b: number, epsilon = 0.01) {
  return Math.abs(a - b) < epsilon;
}
