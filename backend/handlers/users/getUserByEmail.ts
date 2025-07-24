import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUserByEmailHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email } = req.query as { email?: string };

  if (!email) {
    return reply.code(400).send({ error: 'Email обязателен' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  return reply.send(user);
}
