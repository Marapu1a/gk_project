// handlers/ceuSummary/summary.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, CEUCategory } from '@prisma/client';

type CEUSummary = {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
};

const CEU_KEYS: (keyof CEUSummary)[] = ['ethics', 'cultDiver', 'supervision', 'general'];

export async function ceuSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      groups: {
        include: { group: true },
      },
    },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const groupList = dbUser.groups.map(g => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0];

  if (!primaryGroup) {
    return reply.send({ required: null, percent: null, usable: emptySummary() });
  }

  const entries = await prisma.cEUEntry.findMany({
    where: {
      record: { userId: user.userId },
      status: RecordStatus.CONFIRMED,
    },
  });

  const usable = aggregateCEU(entries);
  const nextGroup = getNextGroupName(primaryGroup.name);
  const required = nextGroup ? requirementsByGroup[nextGroup] : null;
  const percent = required ? computePercent(usable, required) : null;

  return reply.send({ required, percent, usable });
}

function emptySummary(): CEUSummary {
  return { ethics: 0, cultDiver: 0, supervision: 0, general: 0 };
}

function aggregateCEU(entries: any[]): CEUSummary {
  const summary = emptySummary();
  for (const e of entries) {
    switch (e.category) {
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

function computePercent(usable: CEUSummary, required: CEUSummary): CEUSummary {
  const percent: CEUSummary = emptySummary();
  for (const key of CEU_KEYS) {
    percent[key] = required[key] > 0
      ? Math.round((usable[key] / required[key]) * 100)
      : 0;
  }
  return percent;
}

function getNextGroupName(current: string): string | null {
  const order = ['Студент', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'];
  const index = order.indexOf(current);
  return index >= 0 && index + 1 < order.length ? order[index + 1] : null;
}

const requirementsByGroup: Record<string, CEUSummary> = {
  'Инструктор': { ethics: 2, cultDiver: 1, supervision: 1, general: 4 },
  'Куратор': { ethics: 3, cultDiver: 1, supervision: 2, general: 5 },
  'Супервизор': { ethics: 4, cultDiver: 2, supervision: 3, general: 6 },
  'Опытный Супервизор': { ethics: 5, cultDiver: 2, supervision: 4, general: 7 },
};
