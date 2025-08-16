// handlers/supervision/getAssignedHours.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  status?: RecordStatus; // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;         // кол-во записей
  cursor?: string;       // пагинация по hour.id
};

export async function getAssignedHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;
  const role = req.user?.role;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });
  if (role !== 'REVIEWER' && role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { status = 'UNCONFIRMED', take = '25', cursor } = req.query as Query;

  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 25));

  const orderBy =
    status === 'UNCONFIRMED'
      ? { record: { createdAt: 'desc' as const } }
      : { reviewedAt: 'desc' as const };

  const hours = await prisma.supervisionHour.findMany({
    where: { reviewerId, status },
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
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy,
  });

  const nextCursor = hours.length === limit ? hours[hours.length - 1].id : null;

  return reply.send({ hours, nextCursor });
}
