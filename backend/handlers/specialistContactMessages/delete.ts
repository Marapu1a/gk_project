import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type DeleteParams = {
  id: string;
};

export async function deleteSpecialistContactMessageHandler(
  req: FastifyRequest<{ Params: DeleteParams }>,
  reply: FastifyReply,
) {
  const user = req.user as { userId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const result = await prisma.specialistContactMessage.deleteMany({
    where: {
      id: req.params.id,
      specialistId: user.userId,
    },
  });

  if (result.count === 0) {
    return reply.code(404).send({ error: 'Сообщение не найдено' });
  }

  return reply.send({ ok: true });
}
