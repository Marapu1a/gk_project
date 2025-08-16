// src/handlers/supervision/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  status?: RecordStatus; // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;         // размер страницы (1..100), по умолчанию 25
  cursor?: string;       // пагинация по hour.id
};

export async function supervisionHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { status, take = '25', cursor } = req.query as Query;

  if (status && !['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }
  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 25));

  const where: any = { record: { userId } };
  if (status) where.status = status;

  // Сортировка: сперва по дате создания записи, затем по дате ревью (чтобы подтверждённые/отклонённые шли логично)
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
      { id: 'desc' }, // стабильность курсора
    ],
  });

  const nextCursor = hours.length === limit ? hours[hours.length - 1].id : null;

  return reply.send({
    items: hours.map(h => ({
      id: h.id,
      recordId: h.record.id,
      fileId: h.record.fileId,
      type: h.type,               // PracticeLevel
      value: h.value,
      status: h.status,           // RecordStatus
      createdAt: h.record.createdAt,
      reviewedAt: h.reviewedAt,
      rejectedReason: h.rejectedReason,
      reviewer: h.reviewer ? { id: h.reviewer.id, fullName: h.reviewer.fullName, email: h.reviewer.email } : null,
    })),
    nextCursor,
  });
}
