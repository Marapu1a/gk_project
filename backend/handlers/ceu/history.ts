// src/handlers/ceu/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function ceuHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!activeCycle) return reply.send([]);

  const entries = await prisma.cEUEntry.findMany({
    where: { record: { userId, cycleId: activeCycle.id } },
    orderBy: [{ record: { eventDate: 'desc' } }, { id: 'desc' }],
    select: {
      id: true,
      category: true,
      value: true,
      status: true,
      rejectedReason: true,
      record: { select: { eventDate: true, eventName: true } },
    },
  });

  return reply.send(
    entries.map((e) => ({
      id: e.id,
      category: e.category,
      value: e.value,
      status: e.status,
      eventDate: e.record.eventDate,
      eventName: e.record.eventName,
      rejectedReason: e.rejectedReason,
    }))
  );
}
