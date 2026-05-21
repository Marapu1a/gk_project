import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { logAdminUserAction } from '../../utils/adminUserActionLog';

type Params = { id: string };
type Body = { reason?: string };

function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (req.user?.role !== 'ADMIN') {
    reply.code(403).send({ error: 'Доступ запрещён' });
    return false;
  }
  return true;
}

export async function archiveUserHandler(req: FastifyRequest, reply: FastifyReply) {
  if (!requireAdmin(req, reply)) return;

  const { id } = req.params as Params;
  const actorId = req.user?.userId;
  if (actorId === id) {
    return reply.code(400).send({ error: 'Нельзя архивировать свой аккаунт' });
  }

  const body = (req.body ?? {}) as Body;
  const reason = body.reason?.trim() || null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      archivedAt: user.archivedAt ?? new Date(),
      archivedById: actorId ?? null,
      archiveReason: reason,
      archiveRequestedAt: null,
      archiveRequestReason: null,
      isProfileVisible: false,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      archivedAt: true,
      archivedById: true,
      archiveReason: true,
      archiveRequestedAt: true,
      archiveRequestReason: true,
    },
  });

  await logAdminUserAction({
    userId: id,
    adminId: actorId,
    action: 'Архивировал профиль',
    details: reason,
  });

  return reply.send({ success: true, user: updated });
}

export async function restoreUserHandler(req: FastifyRequest, reply: FastifyReply) {
  if (!requireAdmin(req, reply)) return;

  const { id } = req.params as Params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      archiveRequestedAt: null,
      archiveRequestReason: null,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      archivedAt: true,
      archivedById: true,
      archiveReason: true,
      archiveRequestedAt: true,
      archiveRequestReason: true,
    },
  });

  await logAdminUserAction({
    userId: id,
    adminId: req.user?.userId,
    action: 'Восстановил профиль из архива',
  });

  return reply.send({ success: true, user: updated });
}
