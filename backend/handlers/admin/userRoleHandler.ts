// /handlers/admin/userRoleHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { logAdminUserAction } from '../../utils/adminUserActionLog';

interface ToggleUserRoleRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
}

export async function toggleUserRoleHandler(
  req: FastifyRequest<ToggleUserRoleRoute>,
  reply: FastifyReply
) {
  const userId = req.params.id;

  if (req.user.userId === userId) {
    return reply.code(400).send({ error: 'Нельзя изменить права администратора у самого себя' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const newRole = user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await logAdminUserAction({
    userId,
    adminId: req.user.userId,
    action: newRole === 'ADMIN' ? 'Назначил администратором' : 'Снял права администратора',
    details: `Роль изменена: ${user.role} -> ${newRole}`,
  });

  return reply.send(updated);
}
