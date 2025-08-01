import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetCEUByEmailQuery extends RouteGenericInterface {
  Querystring: {
    email: string;
    fromDate?: string;
    toDate?: string;
  };
}

export async function getCEUByEmailHandler(
  req: FastifyRequest<GetCEUByEmailQuery>,
  reply: FastifyReply
) {
  const { user } = req;
  const { email, fromDate, toDate } = req.query;

  if (!user?.userId || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (!email) {
    return reply.code(400).send({ error: 'Не указан email' });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true },
  });

  if (!targetUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const records = await prisma.cEURecord.findMany({
    where: {
      userId: targetUser.id,
      eventDate: {
        gte: fromDate ? new Date(fromDate) : undefined,
        lte: toDate ? new Date(toDate) : undefined,
      },
    },
    orderBy: { eventDate: 'desc' },
    select: {
      id: true,
      eventName: true,
      eventDate: true,
      fileId: true,
      entries: {
        select: {
          id: true,
          category: true,
          value: true,
          status: true,
          reviewedAt: true,
          rejectedReason: true,
          reviewer: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  return reply.send({
    user: targetUser,
    records,
  });
}
