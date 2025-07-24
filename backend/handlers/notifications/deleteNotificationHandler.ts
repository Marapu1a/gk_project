import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function deleteNotificationHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string };
  const { id } = req.params as { id: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  // Проверка, чтобы юзер удалял только свои уведомления
  const notif = await prisma.notification.findUnique({ where: { id } });

  if (!notif || notif.userId !== user.userId) {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  await prisma.notification.delete({ where: { id } });

  return reply.send({ ok: true });
}
