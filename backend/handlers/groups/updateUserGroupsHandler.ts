// handlers/groups/updateUserGroupsHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updateUserGroupsSchema } from '../../schemas/updateUserGroups';
import { unlockTargetIfRankChanged } from '../../utils/unlockTargetIfRankChanged';

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
    return reply
      .code(400)
      .send({ error: 'Неверные данные', details: parsed.error.flatten() });
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

    // 3) Разблок цели
    await unlockTargetIfRankChanged(userId, tx);

    // 4) Побочные эффекты при повышении
    let burned = 0;
    let burnedPractice = 0; // <-- NEW
    let examReset = false;
    let examPaymentReset = false;
    let examPaymentResetCount = 0;

    const upgraded = newMaxRank > oldMaxRank;

    if (upgraded) {
      // ---------- 🔥 NEW: сгорание PRACTICE только если впервые получен "Инструктор" ----------
      const hadInstructorBefore = user.groups.some(g => g.group.name === 'Инструктор');
      const hasInstructorAfter = newGroups.some(g => g.group.name === 'Инструктор');

      if (!hadInstructorBefore && hasInstructorAfter) {
        const burn = await tx.supervisionHour.deleteMany({
          where: {
            record: { userId },
            type: { in: ['PRACTICE', 'INSTRUCTOR'] } // SUPERVISION не трогаем — она авто
          }
        });
        burnedPractice = burn.count;
      }

      // ---------- CEU SPENT как у тебя ----------
      const burnRes = await tx.cEUEntry.updateMany({
        where: { record: { userId }, status: 'CONFIRMED' },
        data: { status: 'SPENT', reviewedAt: new Date() },
      });
      burned = burnRes.count;

      await tx.examApplication.upsert({
        where: { userId },
        update: { status: 'NOT_SUBMITTED' },
        create: { userId, status: 'NOT_SUBMITTED' },
      });
      examReset = true;

      const payRes = await tx.payment.updateMany({
        where: { userId, type: 'EXAM_ACCESS', status: { not: 'UNPAID' } },
        data: { status: 'UNPAID', confirmedAt: null, comment: 'Сброшено из-за повышения группы' },
      });
      examPaymentResetCount = payRes.count;
      examPaymentReset = payRes.count > 0;
    }

    // 5) Авто-роли
    const supervisorGroup = await tx.group.findFirst({ where: { name: 'Супервизор' } });
    if (user.role !== 'ADMIN' && supervisorGroup) {
      const isReviewerNow = newGroups.some((g) => g.groupId === supervisorGroup.id);
      const newRole = isReviewerNow ? 'REVIEWER' : 'STUDENT';
      if (newRole !== user.role) {
        await tx.user.update({ where: { id: userId }, data: { role: newRole } });
      }
    }

    return {
      success: true,
      upgraded,
      burned,            // CEU
      burnedPractice,    // NEW поле про практике
      oldMaxRank,
      newMaxRank,
      examReset,
      examPaymentReset,
      examPaymentResetCount,
    };
  });

  return reply.send(result);
}
