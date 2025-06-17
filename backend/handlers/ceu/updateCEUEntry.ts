import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateCEUEntryRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';
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

  if (!reviewerId || (reviewerRole !== 'REVIEWER' && reviewerRole !== 'ADMIN')) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  if (status === 'REJECTED' && !rejectedReason) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  const entry = await prisma.cEUEntry.findUnique({
    where: { id },
    select: { record: { select: { userId: true } }, reviewerId: true },
  });

  if (!entry) {
    return reply.code(404).send({ error: 'Запись не найдена' });
  }

  if (entry.record.userId === reviewerId) {
    return reply.code(403).send({ error: 'Нельзя редактировать свои записи' });
  }

  const updated = await prisma.cEUEntry.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? rejectedReason : null,
      reviewerId,
    },
  });

  return reply.send({ success: true, updated });
}
