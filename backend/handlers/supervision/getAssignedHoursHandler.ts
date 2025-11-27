// handlers/supervision/getAssignedHours.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  status?: RecordStatus; // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;         // кол-во записей
  cursor?: string;       // пагинация по hour.id
};

// Локальная нормализация для обратной совместимости UI:
// - старые значения INSTRUCTOR/CURATOR отображаем как PRACTICE/SUPERVISION
function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type; // SUPERVISOR / PRACTICE / SUPERVISION / прочие неизменны
}

export async function getAssignedHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const { status = 'UNCONFIRMED', take = '25', cursor } = req.query as Query;

  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 25));

  // Новые — по дате заявки, ревью — по дате ревью
  const orderBy =
    status === 'UNCONFIRMED'
      ? { record: { createdAt: 'desc' as const } }
      : { reviewedAt: 'desc' as const };

  const hoursRaw = await prisma.supervisionHour.findMany({
    where: { reviewerId, status },
    select: {
      id: true,
      type: true, // сохраняем как есть из БД, ниже нормализуем для ответа
      value: true,
      status: true,
      reviewedAt: true,
      rejectedReason: true,
      record: {
        select: {
          id: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy,
  });

  // Преобразуем тип для рендера UI, не меняя схему ответа
  const hours = hoursRaw.map((h) => ({
    ...h,
    type: normalizeLevel(h.type),
  }));

  const nextCursor = hoursRaw.length === limit ? hoursRaw[hoursRaw.length - 1].id : null;

  return reply.send({ hours, nextCursor });
}
