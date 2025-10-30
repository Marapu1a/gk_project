// src/handlers/admin/getUserGroupsByIdHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetUserGroupsByIdRoute extends RouteGenericInterface {
  Params: { id: string };
}

export async function getUserGroupsByIdHandler(
  req: FastifyRequest<GetUserGroupsByIdRoute>,
  reply: FastifyReply
) {
  // Доступ только ADMIN и REVIEWER
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'REVIEWER') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const id = String(req.params.id || '').trim();
  if (!id) return reply.code(400).send({ error: 'userId обязателен' });

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      groups: { include: { group: true } },
    },
  });

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const currentGroupIds = user.groups.map((ug) => ug.group.id);

  const allGroups = await prisma.group.findMany({
    orderBy: { rank: 'asc' }, // как и раньше
  });

  return reply.send({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
    currentGroupIds,
    allGroups,
  });
}
