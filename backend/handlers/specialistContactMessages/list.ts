import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function listSpecialistContactMessagesHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.specialistContactMessage.findMany({
      where: { specialistId: user.userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.specialistContactMessage.count({
      where: { specialistId: user.userId, isRead: false },
    }),
  ]);

  return reply.send({ items, unreadCount });
}
