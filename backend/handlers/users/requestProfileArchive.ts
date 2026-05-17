import { NotificationType } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { notifyAdmins } from '../../utils/notifications';

type Body = {
  reason?: string;
};

export async function requestProfileArchiveHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const body = (req.body ?? {}) as Body;
  const reason = body.reason?.trim() || null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      archivedAt: true,
      archiveRequestedAt: true,
    },
  });

  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });
  if (user.archivedAt) return reply.code(400).send({ error: 'Профиль уже в архиве' });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      archiveRequestedAt: user.archiveRequestedAt ?? new Date(),
      archiveRequestReason: reason,
    },
    select: {
      id: true,
      archiveRequestedAt: true,
      archiveRequestReason: true,
    },
  });

  await notifyAdmins({
    type: NotificationType.USER,
    message: `Запрос на удаление профиля: ${user.fullName || user.email}`,
    link: `/admin/users/${encodeURIComponent(user.id)}`,
  });

  return reply.send({ success: true, request: updated });
}
