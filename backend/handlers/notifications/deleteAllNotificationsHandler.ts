import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function deleteAllNotificationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const result = await prisma.notification.deleteMany({
    where: { userId: user.userId },
  });

  return reply.send({ ok: true, deletedCount: result.count });
}
