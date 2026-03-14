import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetCEUByEmailQuery extends RouteGenericInterface {
  Querystring: {
    email: string;
    fromDate?: string;
    toDate?: string;
  };
}

function parseISODateOr400(reply: FastifyReply, raw?: string, field = 'date'): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    reply.code(400).send({ error: `INVALID_${field.toUpperCase()}` });
    return null as any;
  }
  return d;
}

export async function getCEUByEmailHandler(
  req: FastifyRequest<GetCEUByEmailQuery>,
  reply: FastifyReply
) {
  const { user } = req;
  const { email, fromDate, toDate } = req.query;

  // ✅ CEU смотрит только ADMIN (как и ревью)
  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (!email) {
    return reply.code(400).send({ error: 'Не указан email' });
  }

  const from = parseISODateOr400(reply, fromDate, 'fromDate');
  if (from === (null as any)) return;
  const to = parseISODateOr400(reply, toDate, 'toDate');
  if (to === (null as any)) return;

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true },
  });

  if (!targetUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: targetUser.id, status: 'ACTIVE' },
    select: { id: true, targetLevel: true, type: true, startedAt: true },
  });

  if (!activeCycle) {
    return reply.send({
      user: targetUser,
      activeCycle: null,
      records: [],
    });
  }

  const records = await prisma.cEURecord.findMany({
    where: {
      userId: targetUser.id,
      cycleId: activeCycle.id,
      eventDate: {
        gte: from,
        lte: to,
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
            select: { email: true, fullName: true },
          },
        },
      },
    },
  });

  return reply.send({
    user: targetUser,
    activeCycle,
    records,
  });
}
