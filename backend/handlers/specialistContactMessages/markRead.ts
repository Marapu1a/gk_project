import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type MarkReadParams = {
  id: string;
};

export async function markSpecialistContactMessageReadHandler(
  req: FastifyRequest<{ Params: MarkReadParams }>,
  reply: FastifyReply,
) {
  const user = req.user as { userId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const result = await prisma.specialistContactMessage.updateMany({
    where: {
      id: req.params.id,
      specialistId: user.userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  if (result.count === 0) {
    return reply.code(404).send({ error: 'Сообщение не найдено' });
  }

  return reply.send({ ok: true });
}
