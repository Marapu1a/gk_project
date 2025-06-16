// src/handlers/supervision/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function supervisionHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const hours = await prisma.supervisionHour.findMany({
    where: { record: { userId } },
    orderBy: { record: { createdAt: 'desc' } },
    select: {
      id: true,
      type: true,
      value: true,
      status: true,
      record: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  return reply.send(
    hours.map(h => ({
      id: h.id,
      type: h.type,
      value: h.value,
      status: h.status,
      createdAt: h.record.createdAt,
    }))
  );
}
