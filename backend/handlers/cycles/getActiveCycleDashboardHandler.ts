// handlers/cycles/getActiveCycleDashboardHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { CycleStatus, RecordStatus, CEUCategory, PracticeLevel } from '@prisma/client';

type CeuByCategory = Record<CEUCategory, number>;
type HoursByType = Partial<Record<PracticeLevel, number>>;

const ceuCategories: CEUCategory[] = [
  CEUCategory.ETHICS,
  CEUCategory.CULTURAL_DIVERSITY,
  CEUCategory.SUPERVISION,
  CEUCategory.GENERAL,
];

function emptyCeuByCategory(): CeuByCategory {
  return ceuCategories.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as CeuByCategory);
}

export async function getActiveCycleDashboardHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const cycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: {
      id: true,
      userId: true,
      targetLevel: true,
      type: true,
      status: true,
      startedAt: true,
      endedAt: true,
      abandonedReason: true,
      requirementsSnapshot: true,
      modifiersSnapshot: true,
    },
  });

  if (!cycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  // ---- CEU progress (обычно авто CONFIRMED, но считаем по статусам гибко) ----
  const ceuRows = await prisma.cEUEntry.groupBy({
    by: ['category', 'status'],
    where: {
      record: {
        cycleId: cycle.id,
      },
    },
    _sum: {
      value: true,
    },
  });

  const ceuProgressConfirmed = emptyCeuByCategory();
  const ceuPending = emptyCeuByCategory();

  for (const row of ceuRows) {
    const v = row._sum.value ?? 0;
    if (row.status === RecordStatus.CONFIRMED) {
      ceuProgressConfirmed[row.category] += v;
    } else if (row.status === RecordStatus.UNCONFIRMED) {
      ceuPending[row.category] += v;
    }
    // REJECTED/SPENT игнорим в прогрессе
  }

  const ceuTotalConfirmed = Object.values(ceuProgressConfirmed).reduce((a, b) => a + b, 0);
  const ceuTotalPending = Object.values(ceuPending).reduce((a, b) => a + b, 0);

  // ---- Hours progress ----
  const hourRows = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: {
        cycleId: cycle.id,
      },
    },
    _sum: {
      value: true,
    },
  });

  const hoursConfirmedByType: HoursByType = {};
  const hoursPendingByType: HoursByType = {};

  for (const row of hourRows) {
    const v = row._sum.value ?? 0;

    if (row.status === RecordStatus.CONFIRMED) {
      hoursConfirmedByType[row.type] = (hoursConfirmedByType[row.type] ?? 0) + v;
    } else if (row.status === RecordStatus.UNCONFIRMED) {
      hoursPendingByType[row.type] = (hoursPendingByType[row.type] ?? 0) + v;
    }
    // REJECTED/SPENT игнорим в прогрессе
  }

  // Для UI часто нужно именно 2 шкалы.
  // Сейчас у тебя записи приходят как PRACTICE (обычные) и SUPERVISOR (менторские для супервизора).
  const hoursPracticeConfirmed = hoursConfirmedByType[PracticeLevel.PRACTICE] ?? 0;
  const hoursMentorshipConfirmed = hoursConfirmedByType[PracticeLevel.SUPERVISOR] ?? 0;

  const hoursPracticePending = hoursPendingByType[PracticeLevel.PRACTICE] ?? 0;
  const hoursMentorshipPending = hoursPendingByType[PracticeLevel.SUPERVISOR] ?? 0;

  return reply.send({
    success: true,
    cycle,

    // требования пока берём из снапшотов (или null, если ты их ещё не заполняешь).
    // фронт может временно показывать только прогресс без "из X нужно".
    requirements: cycle.requirementsSnapshot ?? null,
    modifiers: cycle.modifiersSnapshot ?? null,

    progress: {
      ceuByCategory: ceuProgressConfirmed,
      ceuTotal: ceuTotalConfirmed,

      // 2 основные шкалы часов
      hoursPractice: hoursPracticeConfirmed,
      hoursMentorship: hoursMentorshipConfirmed,

      // если захочешь рисовать детальнее — есть сырая разбивка
      hoursByType: hoursConfirmedByType,
    },

    pending: {
      ceuByCategory: ceuPending,
      ceuTotal: ceuTotalPending,

      hoursPractice: hoursPracticePending,
      hoursMentorship: hoursMentorshipPending,
      hoursByType: hoursPendingByType,
    },
  });
}
