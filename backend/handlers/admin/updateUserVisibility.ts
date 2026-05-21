import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { logAdminUserAction } from '../../utils/adminUserActionLog';

export async function updateUserVisibilityHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { isProfileVisible } = req.body as { isProfileVisible?: boolean };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (typeof isProfileVisible !== 'boolean') {
    return reply.code(400).send({ error: 'isProfileVisible должен быть boolean' });
  }

  await prisma.user.update({
    where: { id },
    data: { isProfileVisible },
  });

  await logAdminUserAction({
    userId: id,
    adminId: req.user.userId,
    action: isProfileVisible ? 'Показал профиль в реестре' : 'Скрыл профиль из реестра',
  });

  return reply.send({
    ok: true,
    isProfileVisible,
  });
}
