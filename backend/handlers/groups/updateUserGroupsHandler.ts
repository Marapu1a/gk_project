import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updateUserGroupsSchema } from '../../schemas/updateUserGroups';

interface UpdateUserGroupsRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
}

export async function updateUserGroupsHandler(
  req: FastifyRequest<UpdateUserGroupsRoute>,
  reply: FastifyReply
) {
  const userId = req.params.id;
  if (req.user.role !== 'ADMIN' && req.user.role !== 'REVIEWER') {
    return reply.code(403).send({ error: 'Недостаточно прав для изменения групп' });
  }

  const parsed = updateUserGroupsSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { groupIds } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  await prisma.userGroup.deleteMany({ where: { userId } });

  await prisma.userGroup.createMany({
    data: groupIds.map(groupId => ({ userId, groupId })),
  });

  return reply.send({ success: true });
}
