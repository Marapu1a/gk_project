// handlers/notifications/markNotificationReadHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function markNotificationReadHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string };
  const { id } = req.params as { id: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const notif = await prisma.notification.findUnique({ where: { id } });

  if (!notif || notif.userId !== user.userId) {
    return reply.code(404).send({ error: 'Уведомление не найдено' });
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return reply.send({ ok: true });
}
