// handlers/groups/updateUserGroupsHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updateUserGroupsSchema } from '../../schemas/updateUserGroups';

interface UpdateUserGroupsRoute extends RouteGenericInterface {
  Params: { id: string };
}

export async function updateUserGroupsHandler(
  req: FastifyRequest<UpdateUserGroupsRoute>,
  reply: FastifyReply
) {
  const userId = req.params.id;

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ только для администратора' });
  }

  const parsed = updateUserGroupsSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const { groupIds } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const oldMaxRank =
    user.groups.length ? Math.max(...user.groups.map((g) => g.group.rank)) : -Infinity;

  const result = await prisma.$transaction(async (tx) => {
    // 1) Перепривязка групп
    await tx.userGroup.deleteMany({ where: { userId } });

    if (groupIds.length) {
      await tx.userGroup.createMany({
        data: groupIds.map((groupId: string) => ({ userId, groupId })),
      });
    }

    // 2) Новый ранг
    const newGroups = await tx.userGroup.findMany({
      where: { userId },
      include: { group: true },
    });

    const newMaxRank =
      newGroups.length ? Math.max(...newGroups.map((g) => g.group.rank)) : -Infinity;

    const upgraded = newMaxRank > oldMaxRank;

    // 3) ВАЖНО: cycles/target/ceu/hours тут не трогаем вообще.
    // Если админ хочет сбросить цель/цикл — отдельные ручки.

    // 4) Авто-роль (REVIEWER если есть группа "Супервизор", иначе STUDENT), админа не трогаем
    const supervisorGroup = await tx.group.findFirst({ where: { name: 'Супервизор' } });

    let roleChanged = false;
    let roleAfter: string | null = null;

    if (user.role !== 'ADMIN' && supervisorGroup) {
      const isReviewerNow = newGroups.some((g) => g.groupId === supervisorGroup.id);
      const newRole = isReviewerNow ? 'REVIEWER' : 'STUDENT';

      if (newRole !== user.role) {
        await tx.user.update({ where: { id: userId }, data: { role: newRole } });
        roleChanged = true;
        roleAfter = newRole;
      } else {
        roleAfter = user.role;
      }
    } else {
      roleAfter = user.role;
    }

    return {
      success: true,
      upgraded,
      oldMaxRank,
      newMaxRank,
      roleChanged,
      roleAfter,
    };
  });

  return reply.send(result);
}
