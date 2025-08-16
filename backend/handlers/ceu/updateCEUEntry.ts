// handlers/ceu/updateCEUEntryHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateCEUEntryRoute extends RouteGenericInterface {
  Params: { id: string };
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

  // Доступ
  if (!reviewerId || (reviewerRole !== 'REVIEWER' && reviewerRole !== 'ADMIN')) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  // Валидность статуса
  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  // Причина для REJECTED
  if (status === 'REJECTED' && (!rejectedReason || !rejectedReason.trim())) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  // Текущая запись
  const entry = await prisma.cEUEntry.findUnique({
    where: { id },
    select: {
      status: true,
      record: { select: { userId: true } },
      reviewerId: true,
    },
  });

  if (!entry) {
    return reply.code(404).send({ error: 'Запись не найдена' });
  }

  // Запрет редактировать свои записи
  if (entry.record.userId === reviewerId) {
    return reply.code(403).send({ error: 'Нельзя редактировать свои записи' });
  }

  // SPENT необратим
  if (entry.status === 'SPENT') {
    return reply.code(400).send({ error: 'Статус SPENT необратим' });
  }

  // Обновление
  const updated = await prisma.cEUEntry.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? rejectedReason!.trim() : null,
      reviewerId,
    },
  });

  return reply.send({ success: true, updated });
}
