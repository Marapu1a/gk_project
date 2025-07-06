// /handlers/admin/userRoleHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

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

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав для изменения ролей' });
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

  return reply.send(updated);
}
