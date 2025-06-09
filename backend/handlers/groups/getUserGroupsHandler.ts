import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetUserGroupsRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
}

export async function getUserGroupsHandler(
  req: FastifyRequest<GetUserGroupsRoute>,
  reply: FastifyReply
) {
  const userId = req.params.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const currentGroupIds = user.groups.map(g => g.group.id);

  const allGroups = await prisma.group.findMany({
    orderBy: { rank: 'asc' },
  });

  return reply.send({
    userId,
    currentGroupIds,
    allGroups,
  });
}
