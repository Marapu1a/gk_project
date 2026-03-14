// src/handlers/users/setTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { TargetLevel } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getPracticeToSupervisionRatio,
} from '../../utils/supervisionRequirements';

type Body = { targetLevel: TargetLevel | null };

type RequirementsGroupName = keyof typeof supervisionRequirementsByGroup;

const TARGET_RU_BY_LEVEL: Record<TargetLevel, RequirementsGroupName> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

// Какие цели можно выбирать с конкретной активной группы
const ALLOWED_TARGETS_BY_GROUP: Record<string, TargetLevel[]> = {
  Соискатель: ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'],
  Инструктор: ['CURATOR', 'SUPERVISOR'],
  Куратор: ['SUPERVISOR'],
  // 'Супервизор' и 'Опытный Супервизор' — новых целей нет (кроме админских правок)
};

function buildRequirementsSnapshot(targetLevel: TargetLevel) {
  const ru = TARGET_RU_BY_LEVEL[targetLevel];

  const req = supervisionRequirementsByGroup[ru];
  if (!req || typeof req.practice !== 'number') {
    throw new Error('TARGET_REQUIREMENTS_NOT_CONFIGURED');
  }

  const ratio = getPracticeToSupervisionRatio(ru);
  if (typeof ratio !== 'number' || ratio <= 0) {
    throw new Error('TARGET_RATIO_NOT_CONFIGURED');
  }

  return {
    targetLevel, // enum
    practiceRequired: req.practice,
    ratio,
    mentorRequired: targetLevel === TargetLevel.SUPERVISOR ? 24 : 0,
  };
}

export async function setTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  const { id } = req.params as { id: string };
  const { targetLevel } = req.body as Body;

  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const isSelf = user.userId === id;
  const isAdmin = user.role === 'ADMIN';
  if (!isSelf && !isAdmin) return reply.code(403).send({ error: 'FORBIDDEN' });

  if (
    targetLevel !== null &&
    ![TargetLevel.INSTRUCTOR, TargetLevel.CURATOR, TargetLevel.SUPERVISOR].includes(targetLevel)
  ) {
    return reply.code(400).send({ error: 'INVALID_TARGET_LEVEL' });
  }

  // читаем пользователя, активный ранг и текущий lock
  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      targetLevel: true,
      targetLockRank: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });
  if (!dbUser) return reply.code(404).send({ error: 'USER_NOT_FOUND' });

  const groupsSorted = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);

  const activeRank = groupsSorted[0]?.rank ?? 0;
  const activeGroupName = groupsSorted[0]?.name ?? null;

  // if user is already at top (Супервизор / Опытный), нормальные цели ему не положены
  if (!isAdmin && (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор')) {
    if (targetLevel !== null) {
      return reply.code(400).send({ error: 'NO_TARGET_FOR_SUPERVISOR' });
    }
  }

  // запрет опускать цель ниже достигнутого уровня
  if (targetLevel) {
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: Object.values(TARGET_RU_BY_LEVEL) } },
      select: { name: true, rank: true },
    });
    const rankByName = new Map(targetGroups.map((g) => [g.name, g.rank]));
    const targetName = TARGET_RU_BY_LEVEL[targetLevel];
    const targetRank = rankByName.get(targetName);

    if (typeof targetRank !== 'number') {
      return reply.code(500).send({ error: 'TARGET_GROUP_NOT_CONFIGURED' });
    }

    // цель не может быть ниже текущего ранга
    if (targetRank < activeRank) {
      return reply.code(400).send({ error: 'TARGET_BELOW_ACTIVE' });
    }

    // и не может быть "нелегальной" для текущей группы (кроме админов)
    if (!isAdmin) {
      const allowed =
        (activeGroupName && ALLOWED_TARGETS_BY_GROUP[activeGroupName]) ??
        // если групп ещё нет, считаем как "Соискатель"
        [TargetLevel.INSTRUCTOR, TargetLevel.CURATOR, TargetLevel.SUPERVISOR];

      if (!allowed.includes(targetLevel)) {
        return reply.code(400).send({ error: 'TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP' });
      }
    }
  }

  // lock активен, если цель уже стояла и зафиксирована на текущем ранге
  const lockedNow =
    dbUser.targetLevel !== null &&
    dbUser.targetLockRank !== null &&
    dbUser.targetLockRank === activeRank;

  // Если ничего не меняется — короткий выход
  if (
    dbUser.targetLevel === targetLevel &&
    ((targetLevel === null && dbUser.targetLockRank === null) ||
      (targetLevel !== null && dbUser.targetLockRank === activeRank))
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
  const adminIds = adminList.map((a) => a.id);

  // --- Ветвление по целям ---

  // 1) Сброс на "нет цели"
  if (targetLevel === null) {
    if (lockedNow && !isAdmin) {
      return reply.code(403).send({ error: 'TARGET_LOCKED' });
    }

    const { updated, resetCount } = await prisma.$transaction(async (tx) => {
      const activeCycle = await tx.certificationCycle.findFirst({
        where: { userId: id, status: 'ACTIVE' },
        select: { id: true, targetLevel: true, type: true },
      });

      if (activeCycle) {
        await tx.certificationCycle.update({
          where: { id: activeCycle.id },
          data: {
            status: 'ABANDONED',
            endedAt: new Date(),
            abandonedReason: 'Сброс цели пользователем/админом',
          },
        });
      }

      const updated = await tx.user.update({
        where: { id },
        data: { targetLevel: null, targetLockRank: null },
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
          comment: 'Сброшено: возврат к выбору цели',
        },
      });

      if (adminIds.length) {
        const message =
          `Пользователь ${dbUser.fullName ?? dbUser.email ?? dbUser.id} ` +
          `сбросил цель. Сброшено платежей: ${reset.count}.`;
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

  // 2) Установка/смена цели: запрещаем, если locked и не админ
  if (lockedNow && !isAdmin) {
    return reply.code(403).send({ error: 'TARGET_LOCKED' });
  }

  let requirementsSnapshot: ReturnType<typeof buildRequirementsSnapshot>;
  try {
    requirementsSnapshot = buildRequirementsSnapshot(targetLevel);
  } catch (e: any) {
    if (e?.message === 'TARGET_REQUIREMENTS_NOT_CONFIGURED') {
      return reply.code(500).send({ error: 'TARGET_REQUIREMENTS_NOT_CONFIGURED' });
    }
    if (e?.message === 'TARGET_RATIO_NOT_CONFIGURED') {
      return reply.code(500).send({ error: 'TARGET_RATIO_NOT_CONFIGURED' });
    }
    throw e;
  }

  const { updated, resetCount } = await prisma.$transaction(async (tx) => {
    const activeCycle = await tx.certificationCycle.findFirst({
      where: { userId: id, status: 'ACTIVE' },
      select: { id: true, targetLevel: true, type: true },
    });

    if (activeCycle) {
      await tx.certificationCycle.update({
        where: { id: activeCycle.id },
        data: {
          status: 'ABANDONED',
          endedAt: new Date(),
          abandonedReason: `Смена цели: ${activeCycle.targetLevel} → ${targetLevel}`,
        },
      });
    }

    await tx.certificationCycle.create({
      data: {
        userId: id,
        targetLevel,
        type: 'CERTIFICATION',
        status: 'ACTIVE',
        requirementsSnapshot,
        // modifiersSnapshot оставляем null
      },
      select: { id: true },
    });

    const updated = await tx.user.update({
      where: { id },
      data: { targetLevel, targetLockRank: activeRank },
      select: { id: true, targetLevel: true, targetLockRank: true },
    });

    const reset = await tx.payment.updateMany({
      where: {
        userId: id,
        type: { in: ['DOCUMENT_REVIEW', 'REGISTRATION', 'EXAM_ACCESS', 'FULL_PACKAGE'] },
        status: { in: ['PENDING', 'PAID'] },
      },
      data: {
        status: 'UNPAID',
        confirmedAt: null,
        comment: `Сброшено из-за смены цели на ${targetLevel}`,
      },
    });

    if (adminIds.length) {
      const targetName = TARGET_RU_BY_LEVEL[targetLevel!];
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
