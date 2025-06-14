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

  // После обновления групп
  const supervisorGroup = await prisma.group.findFirst({ where: { name: 'Супервизор' } });

  if (supervisorGroup && user.role !== 'ADMIN') {
    const isNowReviewer = groupIds.includes(supervisorGroup.id);

    // Обновим только если реально нужно менять
    if (
      (isNowReviewer && user.role !== 'REVIEWER') ||
      (!isNowReviewer && user.role === 'REVIEWER')
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: isNowReviewer ? 'REVIEWER' : 'STUDENT' },
      });
    }
  }

  return reply.send({ success: true });
}
