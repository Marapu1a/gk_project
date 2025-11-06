// src/handlers/supervision/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  status?: RecordStatus; // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;         // размер страницы (1..100), по умолчанию 25
  cursor?: string;       // пагинация по hour.id
};

// Локальная нормализация типов для обратной совместимости UI:
// INSTRUCTOR → PRACTICE, CURATOR → SUPERVISION, остальное как есть.
function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type;
}

export async function supervisionHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { status, take = '25', cursor } = req.query as Query;

  if (status && !['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const limitNum = Number(take);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitNum) ? limitNum : 25));

  const where: any = { record: { userId } };
  if (status) where.status = status;

  // Сортировка истории:
  // 1) свежие заявки выше; 2) внутри — последние ревью выше; 3) стабильность курсора по id.
  const hours = await prisma.supervisionHour.findMany({
    where,
    select: {
      id: true,
      type: true,
      value: true,
      status: true,
      reviewedAt: true,
      rejectedReason: true,
      reviewer: { select: { id: true, fullName: true, email: true } },
      record: { select: { id: true, createdAt: true, fileId: true } },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [
      { record: { createdAt: 'desc' } },
      { reviewedAt: 'desc' },
      { id: 'desc' },
    ],
  });

  const nextCursor = hours.length === limit ? hours[hours.length - 1].id : null;

  return reply.send({
    items: hours.map((h) => ({
      id: h.id,
      recordId: h.record.id,
      fileId: h.record.fileId,
      type: normalizeLevel(h.type), // приводим к PRACTICE/SUPERVISION для старых значений
      value: h.value,
      status: h.status,
      createdAt: h.record.createdAt,
      reviewedAt: h.reviewedAt,
      rejectedReason: h.rejectedReason,
      reviewer: h.reviewer
        ? { id: h.reviewer.id, fullName: h.reviewer.fullName, email: h.reviewer.email }
        : null,
    })),
    nextCursor,
  });
}
