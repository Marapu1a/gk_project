// handlers/notifications/getNotificationsHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import {
  normalizeNotificationLink,
  normalizeNotificationType,
} from '../../utils/notifications';

export async function getNotificationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(
    notifications.map((notification) => {
      const type = normalizeNotificationType(notification.type, notification.message);

      return {
        ...notification,
        type,
        link: normalizeNotificationLink(notification.link, type, notification.message),
      };
    }),
  );
}
