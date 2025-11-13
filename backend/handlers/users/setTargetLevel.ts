// src/handlers/users/setTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
type Body = { targetLevel: TargetLevel | null };

const TARGET_NAME_BY_LEVEL: Record<TargetLevel, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export async function setTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  const { id } = req.params as { id: string };
  const { targetLevel } = req.body as Body;

  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const isSelf = user.userId === id;
  const isAdmin = user.role === 'ADMIN';
  if (!isSelf && !isAdmin) return reply.code(403).send({ error: 'FORBIDDEN' });

  if (targetLevel !== null && !['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'].includes(targetLevel)) {
    return reply.code(400).send({ error: 'INVALID_TARGET_LEVEL' });
  }

  // читаем пользователя, активный ранг и текущий lock
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,            // NEW: для текста уведомления (не обязательно, но полезно)
      fullName: true,         // NEW
      targetLevel: true,
      targetLockRank: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });
  if (!dbUser) return reply.code(404).send({ error: 'USER_NOT_FOUND' });

  const activeRank = dbUser.groups.map((g) => g.group.rank).sort((a, b) => b - a)[0] ?? 0;

  // запрет опускать цель ниже достигнутого уровня
  if (targetLevel) {
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: Object.values(TARGET_NAME_BY_LEVEL) } },
      select: { name: true, rank: true },
    });
    const rankByName = new Map(targetGroups.map((g) => [g.name, g.rank]));
    const targetName = TARGET_NAME_BY_LEVEL[targetLevel];
    const targetRank = rankByName.get(targetName);
    if (typeof targetRank !== 'number') {
      return reply.code(500).send({ error: 'TARGET_GROUP_NOT_CONFIGURED' });
    }
    if (targetRank < activeRank) {
      return reply.code(400).send({ error: 'TARGET_BELOW_ACTIVE' });
    }
  }

  // lock активен, если цель уже стояла и зафиксирована на текущем ранге
  const lockedNow =
    dbUser.targetLevel !== null &&
    dbUser.targetLockRank !== null &&
    dbUser.targetLockRank === activeRank;

  // Если ничего не меняется — короткий выход
  if (
    (dbUser.targetLevel === targetLevel &&
      ((targetLevel === null && dbUser.targetLockRank === null) ||
        (targetLevel !== null && dbUser.targetLockRank === activeRank)))
  ) {
    return reply.send({
      id: dbUser.id,
      targetLevel: dbUser.targetLevel,
      targetLockRank: dbUser.targetLockRank,
      resetCount: 0,
    });
  }

  const adminList = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  const adminIds = adminList.map(a => a.id);

  // --- Ветвление по целям ---

  // 1) Сброс на "Лесенку": разрешаем, если НЕ locked или админ
  if (targetLevel === null) {
    if (lockedNow && !isAdmin) {
      return reply.code(403).send({ error: 'TARGET_LOCKED' });
    }

    const { updated, resetCount } = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { targetLevel: null, targetLockRank: null }, // сняли цель и замок
        select: { id: true, targetLevel: true, targetLockRank: true },
      });

      const reset = await tx.payment.updateMany({
        where: {
          userId: id,
          type: { in: ['DOCUMENT_REVIEW', 'EXAM_ACCESS', 'REGISTRATION', 'FULL_PACKAGE'] },
          status: { in: ['PENDING', 'PAID'] },
        },
        data: {
          status: 'UNPAID',
          confirmedAt: null,
          comment: 'Сброшено: возврат на «лесенку»',
        },
      });

      // NEW: notify admins
      if (adminIds.length) {
        const message =
          `Пользователь ${dbUser.fullName ?? dbUser.email ?? dbUser.id} ` +
          `сбросил цель на «Лесенку». Сброшено платежей: ${reset.count}.`;
        await tx.notification.createMany({
          data: adminIds.map((adminId) => ({
            userId: adminId,
            type: 'PAYMENT' as any,
            message,
            link: `/admin/users/${id}`,
          })),
        });
      }

      return { updated, resetCount: reset.count };
    });

    return reply.send({ ...updated, resetCount });
  }

  // 2) Установка/смена цели на конкретный уровень: запрещаем, если locked и не админ
  if (lockedNow && !isAdmin) {
    return reply.code(403).send({ error: 'TARGET_LOCKED' });
  }

  const { updated, resetCount } = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { targetLevel, targetLockRank: activeRank }, // ставим замок на текущем ранге
      select: { id: true, targetLevel: true, targetLockRank: true },
    });

    const reset = await tx.payment.updateMany({
      where: {
        userId: id,
        type: { in: ['EXAM_ACCESS'] },
        status: { in: ['PENDING', 'PAID'] },
      },
      data: {
        status: 'UNPAID',
        confirmedAt: null,
        comment: `Сброшено из-за смены цели на ${targetLevel}`,
      },
    });

    // NEW: notify admins
    if (adminIds.length) {
      const targetName = TARGET_NAME_BY_LEVEL[targetLevel!];
      const message =
        `Пользователь ${dbUser.fullName ?? dbUser.email ?? dbUser.id} ` +
        `изменил цель на «${targetName}». Сброшено платежей: ${reset.count}.`;
      await tx.notification.createMany({
        data: adminIds.map((adminId) => ({
          userId: adminId,
          type: 'PAYMENT' as any,
          message,
          link: `/admin/users/${id}`,
        })),
      });
    }

    return { updated, resetCount: reset.count };
  });

  return reply.send({ ...updated, resetCount });
}
