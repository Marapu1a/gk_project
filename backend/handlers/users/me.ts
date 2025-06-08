import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      groups: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const groupList = dbUser.groups
    .map(({ group }) => ({
      id: group.id,
      name: group.name,
      rank: group.rank,
    }))
    .sort((a, b) => b.rank - a.rank);

  const primaryGroup = groupList[0]
    ? { id: groupList[0].id, name: groupList[0].name }
    : null;

  return reply.send({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    fullName: `${dbUser.firstName} ${dbUser.lastName}`,
    groups: groupList.map(({ id, name }) => ({ id, name })),
    primaryGroup,
  });
}
