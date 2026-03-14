// handlers/ceu/updateCEUEntryHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateCEUEntryRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
  };
}

export async function updateCEUEntryHandler(
  req: FastifyRequest<UpdateCEUEntryRoute>,
  reply: FastifyReply
) {
  const { id } = req.params;
  const { status, rejectedReason } = req.body;
  const reviewerId = req.user?.userId;
  const reviewerRole = req.user?.role;

  if (!reviewerId || reviewerRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор может проверять CEU-баллы' });
  }

  if (status !== 'CONFIRMED' && status !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const reason = (rejectedReason ?? '').trim();
  if (status === 'REJECTED' && !reason) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  const entry = await prisma.cEUEntry.findUnique({
    where: { id },
    select: {
      status: true,
      record: { select: { userId: true, cycleId: true } },
    },
  });
  if (!entry) return reply.code(404).send({ error: 'Запись не найдена' });

  if (entry.record.userId === reviewerId) {
    return reply.code(403).send({ error: 'Нельзя редактировать свои записи' });
  }

  if (!entry.record.cycleId) {
    return reply.code(400).send({ error: 'CEU_NOT_LINKED_TO_CYCLE' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: entry.record.userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!activeCycle || activeCycle.id !== entry.record.cycleId) {
    return reply.code(400).send({ error: 'CEU_NOT_IN_ACTIVE_CYCLE' });
  }

  if (entry.status === status) {
    return reply.send({ success: true, updated: { id, status: entry.status } });
  }

  // ✅ защита от гонки с выдачей сертификата: SPENT не даём переписать
  const res = await prisma.cEUEntry.updateMany({
    where: { id, status: { not: 'SPENT' } },
    data: {
      status,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? reason : null,
      reviewerId,
    },
  });

  if (res.count === 0) {
    return reply.code(400).send({ error: 'Статус SPENT необратим' });
  }

  return reply.send({ success: true, updated: { id, status } });
}
