import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface GetUserGroupsByEmailRoute extends RouteGenericInterface {
  Params: {
    email: string;
  };
}

export async function getUserGroupsByEmailHandler(
  req: FastifyRequest<GetUserGroupsByEmailRoute>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'REVIEWER') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const email = decodeURIComponent(req.params.email).toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
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

  const currentGroupIds = user.groups.map((g) => g.group.id);

  const allGroups = await prisma.group.findMany({
    orderBy: { rank: 'asc' },
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
