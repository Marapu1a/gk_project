// src/handlers/ceu/ceuSummaryHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, CEUCategory } from '@prisma/client';
import {
  ceuRequirementsByGroup as requirementsByGroup,
  annualCeuRequirementsByGroup,
  getNextGroupName,
  type CEUSummary,
  type GroupName,
} from '../../utils/ceuRequirements';

const CEU_KEYS: (keyof CEUSummary)[] = ['ethics', 'cultDiver', 'supervision', 'general'];

const RU_BY_LEVEL: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

type Query = { level?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' };

export async function ceuSummaryHandler(
  req: FastifyRequest<{ Querystring: Query }>,
  reply: FastifyReply,
) {
  const { user } = req;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      targetLevel: true, // <-- важно
      groups: {
        select: {
          group: {
            select: { id: true, name: true, rank: true },
          },
        },
      },
    },
  });
  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0];

  const [confirmedEntries, spentEntries] = await Promise.all([
    prisma.cEUEntry.findMany({
      where: { record: { userId: user.userId }, status: RecordStatus.CONFIRMED },
    }),
    prisma.cEUEntry.findMany({
      where: { record: { userId: user.userId }, status: RecordStatus.SPENT },
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

  const primaryName = primaryGroup.name as GroupName | string;
  const isSupervisorGroup =
    primaryName === 'Супервизор' || primaryName === 'Опытный Супервизор';

  let required: CEUSummary | null = null;

  if (isSupervisorGroup) {
    // 🔹 ДЛЯ СУПЕРВИЗОРОВ: годовые требования непрерывного образования (24 CEU)
    const annual = annualCeuRequirementsByGroup[primaryName as GroupName];
    required = annual ?? null;
  } else {
    // 🔹 Для всех остальных: экзаменационные требования к целевой группе (как было)
    const explicitLevel = req.query?.level;
    const targetFromUser = dbUser.targetLevel ?? undefined;

    const targetGroupName =
      (explicitLevel && RU_BY_LEVEL[explicitLevel]) ||
      (targetFromUser && RU_BY_LEVEL[targetFromUser]) ||
      getNextGroupName(primaryGroup.name);

    required =
      (targetGroupName &&
        (requirementsByGroup[targetGroupName as GroupName] ?? null)) ||
      null;
  }

  const percent = required ? computePercent(usable, required) : null;

  return reply.send({ required, percent, usable, spent, total });
}

// ----------------- helpers -----------------

function emptySummary(): CEUSummary {
  return { ethics: 0, cultDiver: 0, supervision: 0, general: 0 };
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
  return summary;
}

function addSums(a: CEUSummary, b: CEUSummary): CEUSummary {
  return {
    ethics: a.ethics + b.ethics,
    cultDiver: a.cultDiver + b.cultDiver,
    supervision: a.supervision + b.supervision,
    general: a.general + b.general,
  };
}

function computePercent(usable: CEUSummary, required: CEUSummary): CEUSummary {
  const percent: CEUSummary = emptySummary();
  for (const key of CEU_KEYS) {
    percent[key] = required[key] > 0 ? Math.round((usable[key] / required[key]) * 100) : 0;
  }
  return percent;
}
