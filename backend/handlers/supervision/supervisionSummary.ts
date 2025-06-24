// handlers/ceuSummary/supervisionSummary.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';

// Типы по категориям часов
type SupervisionSummary = {
  instructor: number;
  curator: number;
  supervisor: number;
};

const SUPERVISION_KEYS: (keyof SupervisionSummary)[] = ['instructor', 'curator', 'supervisor'];

export async function supervisionSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      groups: {
        include: { group: true },
      },
    },
  });

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = dbUser.groups.map(g => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0];

  if (!primaryGroup) {
    return reply.send({ required: null, percent: null, usable: emptySupervision() });
  }

  const hours = await prisma.supervisionHour.findMany({
    where: {
      record: { userId: user.userId },
      status: RecordStatus.CONFIRMED,
    },
  });

  const usable = aggregateHours(hours);

  // Добавляем стартовое значение для SUPERVISOR, если пользователь — "Супервизор"
  if (primaryGroup.name === 'Супервизор') {
    usable.supervisor += usable.instructor + usable.curator;
  }

  const nextGroup = getNextGroupName(primaryGroup.name);
  const required = nextGroup ? hourRequirementsByGroup[nextGroup] : null;
  const percent = required ? computePercent(usable, required) : null;

  return reply.send({ required, percent, usable });
}

function emptySupervision(): SupervisionSummary {
  return { instructor: 0, curator: 0, supervisor: 0 };
}

function aggregateHours(entries: any[]): SupervisionSummary {
  const summary = emptySupervision();
  for (const h of entries) {
    switch (h.type) {
      case PracticeLevel.INSTRUCTOR:
        summary.instructor += h.value;
        break;
      case PracticeLevel.CURATOR:
        summary.curator += h.value;
        break;
      case PracticeLevel.SUPERVISOR:
        summary.supervisor += h.value;
        break;
    }
  }
  return summary;
}

function computePercent(usable: SupervisionSummary, required: SupervisionSummary): SupervisionSummary {
  const percent: SupervisionSummary = emptySupervision();
  for (const key of SUPERVISION_KEYS) {
    percent[key] = required[key] > 0 ? Math.round((usable[key] / required[key]) * 100) : 0;
  }
  return percent;
}

function getNextGroupName(current: string): string | null {
  const order = ['Студент', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'];
  const index = order.indexOf(current);
  return index >= 0 && index + 1 < order.length ? order[index + 1] : null;
}

const hourRequirementsByGroup: Record<string, SupervisionSummary> = {
  'Инструктор': { instructor: 150, curator: 150, supervisor: 0 },
  'Куратор': { instructor: 300, curator: 300, supervisor: 0 },
  'Супервизор': { instructor: 500, curator: 500, supervisor: 0 },
  'Опытный Супервизор': { instructor: 0, curator: 0, supervisor: 2000 },
};
