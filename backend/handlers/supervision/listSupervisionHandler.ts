import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  userId?: string;                      // чьи записи смотреть (только ADMIN/REVIEWER)
  status?: RecordStatus;               // UNCONFIRMED | CONFIRMED | REJECTED | SPENT (обычно без SPENT)
  take?: string;                       // кол-во записей (строкой из query)
  cursor?: string;                     // id записи для пагинации
};

export async function listSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const actorId = req.user?.userId;
  const actorRole = req.user?.role;
  if (!actorId) return reply.code(401).send({ error: 'Не авторизован' });

  const { userId: qUserId, status, take = '20', cursor } = req.query as Query;

  // Кого смотрим
  const targetUserId =
    (actorRole === 'ADMIN' || actorRole === 'REVIEWER') && qUserId ? qUserId : actorId;

  // Валидации
  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 20));
  if (status && !['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  // Фильтр по статусу влияет и на hours внутри include
  const recordWhere: any = { userId: targetUserId };
  if (status) {
    recordWhere.hours = { some: { status } };
  }

  const records = await prisma.supervisionRecord.findMany({
    where: recordWhere,
    include: {
      hours: {
        ...(status ? { where: { status } } : {}),
        orderBy: { reviewedAt: 'desc' },
      },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  });

  const nextCursor = records.length === limit ? records[records.length - 1].id : null;

  return reply.send({
    records,
    nextCursor,
  });
}
