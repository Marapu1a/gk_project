import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateSupervisionHourRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
  };
}

export async function updateSupervisionHourHandler(
  req: FastifyRequest<UpdateSupervisionHourRoute>,
  reply: FastifyReply
) {
  const reviewerId = req.user?.userId;
  const { id } = req.params;
  const { status, rejectedReason } = req.body;

  if (!reviewerId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  if (status !== 'CONFIRMED' && status !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  if (status === 'REJECTED' && !rejectedReason) {
    return reply.code(400).send({ error: 'Не указана причина отклонения' });
  }

  const existing = await prisma.supervisionHour.findUnique({
    where: { id },
    select: { reviewerId: true },
  });

  if (!existing || existing.reviewerId !== reviewerId) {
    return reply.code(403).send({ error: 'Доступ запрещён или заявка не найдена' });
  }

  const updated = await prisma.supervisionHour.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? rejectedReason : null,
    },
  });

  return reply.send({ success: true, updated });
}
