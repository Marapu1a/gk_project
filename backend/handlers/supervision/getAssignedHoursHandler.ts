// handlers/supervision/getAssignedHours.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  status?: RecordStatus;
  take?: string;
  cursor?: string;
};

function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type;
}

export async function getAssignedHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const { status = 'UNCONFIRMED', take = '25', cursor } = req.query as Query;

  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 25));

  // ✅ для курсора стабильнее сортировать по id
  const orderBy =
    status === 'UNCONFIRMED'
      ? ({ id: 'desc' as const })
      : ({ reviewedAt: 'desc' as const, id: 'desc' as const });

  const hoursRaw = await prisma.supervisionHour.findMany({
    where: {
      reviewerId,
      status,
      record: {
        cycleId: { not: null },
        cycle: { status: 'ACTIVE' }, // сначала режем по активному циклу у записи
      },
    },
    select: {
      id: true,
      type: true,
      value: true,
      status: true,
      reviewedAt: true,
      rejectedReason: true,
      record: {
        select: {
          id: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, fullName: true, email: true } },
          cycleId: true,
        },
      },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy,
  });

  // ✅ доказываем, что запись действительно в текущем ACTIVE цикле автора
  const userIds = Array.from(new Set(hoursRaw.map((h) => h.record.userId)));
  const activeCycles = await prisma.certificationCycle.findMany({
    where: { userId: { in: userIds }, status: 'ACTIVE' },
    select: { userId: true, id: true },
  });
  const activeCycleIdByUser = new Map(activeCycles.map((c) => [c.userId, c.id]));

  const filtered = hoursRaw.filter((h) => {
    const activeId = activeCycleIdByUser.get(h.record.userId);
    return !!activeId && h.record.cycleId === activeId;
  });

  const hours = filtered.map((h) => ({
    ...h,
    type: normalizeLevel(h.type),
  }));

  const nextCursor = hoursRaw.length === limit ? hoursRaw[hoursRaw.length - 1].id : null;

  return reply.send({ hours, nextCursor });
}
