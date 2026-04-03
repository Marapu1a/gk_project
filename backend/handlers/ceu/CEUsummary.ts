// src/handlers/ceu/ceuSummaryHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, CEUCategory, CycleStatus, CycleType } from '@prisma/client';
import {
  ceuRequirementsByGroup as requirementsByGroup,
  renewalCeuRequirementsByGroup,
  getNextGroupName,
  type CEUSummary,
  type GroupName,
} from '../../utils/ceuRequirements';

const CEU_KEYS: Array<Exclude<keyof CEUSummary, 'total'>> = [
  'ethics',
  'cultDiver',
  'supervision',
  'general',
];

const RU_BY_LEVEL: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

type Query = { level?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' };

export async function ceuSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      targetLevel: true,
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });
  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0];

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: CycleStatus.ACTIVE },
    select: { id: true, type: true, targetLevel: true },
  });

  if (!activeCycle) {
    const usable = emptySummary();
    const spent = emptySummary();
    const total = emptySummary();

    return reply.send({
      required: null,
      percent: null,
      usable,
      spent,
      total,
    });
  }

  const [confirmedEntries, spentEntries] = await Promise.all([
    prisma.cEUEntry.findMany({
      where: {
        status: RecordStatus.CONFIRMED,
        record: { cycleId: activeCycle.id },
      },
    }),
    prisma.cEUEntry.findMany({
      where: {
        status: RecordStatus.SPENT,
        record: { cycleId: activeCycle.id },
      },
    }),
  ]);

  const usable = aggregateCEU(confirmedEntries);
  const spent = aggregateCEU(spentEntries);
  const total = addSums(usable, spent);

  if (!primaryGroup) {
    return reply.send({
      required: null,
      percent: null,
      usable,
      spent,
      total,
    });
  }

  let required: CEUSummary | null = null;

  if (activeCycle.type === CycleType.RENEWAL) {
    const renewalGroupName = RU_BY_LEVEL[activeCycle.targetLevel] as GroupName;
    required = renewalCeuRequirementsByGroup[renewalGroupName] ?? null;
  } else {
    const q = (req.query ?? {}) as Query;
    const explicitLevel = q.level;
    const targetFromUser = dbUser.targetLevel ?? undefined;

    const targetGroupName =
      (explicitLevel && RU_BY_LEVEL[explicitLevel]) ||
      (targetFromUser && RU_BY_LEVEL[targetFromUser]) ||
      getNextGroupName(primaryGroup.name);

    required =
      (targetGroupName && (requirementsByGroup[targetGroupName as GroupName] ?? null)) || null;
  }

  const percent = required ? computePercent(usable, required) : null;

  return reply.send({ required, percent, usable, spent, total });
}

// ----------------- helpers -----------------

function emptySummary(): CEUSummary {
  return { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 };
}

function aggregateCEU(entries: any[]): CEUSummary {
  const summary = emptySummary();

  for (const e of entries) {
    switch (e.category as CEUCategory) {
      case CEUCategory.ETHICS:
        summary.ethics += e.value;
        break;
      case CEUCategory.CULTURAL_DIVERSITY:
        summary.cultDiver += e.value;
        break;
      case CEUCategory.SUPERVISION:
        summary.supervision += e.value;
        break;
      case CEUCategory.GENERAL:
        summary.general += e.value;
        break;
    }
  }

  summary.total =
    summary.ethics +
    summary.cultDiver +
    summary.supervision +
    summary.general;

  return summary;
}

function addSums(a: CEUSummary, b: CEUSummary): CEUSummary {
  return {
    ethics: a.ethics + b.ethics,
    cultDiver: a.cultDiver + b.cultDiver,
    supervision: a.supervision + b.supervision,
    general: a.general + b.general,
    total: a.total + b.total,
  };
}

function computePercent(usable: CEUSummary, required: CEUSummary): CEUSummary {
  const percent: CEUSummary = emptySummary();

  for (const key of CEU_KEYS) {
    percent[key] = required[key] > 0
      ? Math.round((Math.min(usable[key], required[key]) / required[key]) * 100)
      : 0;
  }

  percent.total = required.total > 0
    ? Math.round((Math.min(usable.total, required.total) / required.total) * 100)
    : 0;

  return percent;
}
