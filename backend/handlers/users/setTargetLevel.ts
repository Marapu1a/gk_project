// src/handlers/users/setTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { TargetLevel, CycleType } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getPracticeToSupervisionRatio,
} from '../../utils/supervisionRequirements';

type GoalMode = 'CERTIFICATION' | 'RENEWAL';

type Body = {
  targetLevel: TargetLevel | null;
  goalMode?: GoalMode;
};

type RequirementsGroupName = keyof typeof supervisionRequirementsByGroup;

const TARGET_RU_BY_LEVEL: Record<TargetLevel, RequirementsGroupName> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

// Какие цели можно выбирать с конкретной активной группы для ПЕРВИЧНОЙ сертификации
const ALLOWED_CERTIFICATION_TARGETS_BY_GROUP: Record<string, TargetLevel[]> = {
  Соискатель: ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'],
  Инструктор: ['CURATOR', 'SUPERVISOR'],
  Куратор: ['SUPERVISOR'],
  // 'Супервизор' и 'Опытный Супервизор' — новых целей нет
};

// Какие цели можно выбирать с конкретной активной группы для РЕСЕРТИФИКАЦИИ
const ALLOWED_RENEWAL_TARGETS_BY_GROUP: Record<string, TargetLevel[]> = {
  Инструктор: ['INSTRUCTOR'],
  Куратор: ['CURATOR'],
  Супервизор: ['SUPERVISOR'],
  'Опытный Супервизор': ['SUPERVISOR'],
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
    targetLevel,
    practiceRequired: req.practice,
    ratio,
    mentorRequired: targetLevel === TargetLevel.SUPERVISOR ? 24 : 0,
  };
}

function getAllowedTargetsByMode(goalMode: GoalMode, activeGroupName: string | null): TargetLevel[] {
  if (goalMode === 'RENEWAL') {
    if (!activeGroupName) return [];
    return ALLOWED_RENEWAL_TARGETS_BY_GROUP[activeGroupName] ?? [];
  }

  if (!activeGroupName) {
    return [TargetLevel.INSTRUCTOR, TargetLevel.CURATOR, TargetLevel.SUPERVISOR];
  }

  return (
    ALLOWED_CERTIFICATION_TARGETS_BY_GROUP[activeGroupName] ?? [
      TargetLevel.INSTRUCTOR,
      TargetLevel.CURATOR,
      TargetLevel.SUPERVISOR,
    ]
  );
}

function getModeRu(goalMode: GoalMode) {
  return goalMode === 'RENEWAL' ? 'ресертификация' : 'сертификация';
}

export async function setTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  const { id } = req.params as { id: string };
  const { targetLevel, goalMode = 'CERTIFICATION' } = req.body as Body;

  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  if (!['CERTIFICATION', 'RENEWAL'].includes(goalMode)) {
    return reply.code(400).send({ error: 'INVALID_GOAL_MODE' });
  }

  const isSelf = user.userId === id;
  const isAdmin = user.role === 'ADMIN';
  if (!isSelf && !isAdmin) return reply.code(403).send({ error: 'FORBIDDEN' });

  if (
    targetLevel !== null &&
    ![TargetLevel.INSTRUCTOR, TargetLevel.CURATOR, TargetLevel.SUPERVISOR].includes(targetLevel)
  ) {
    return reply.code(400).send({ error: 'INVALID_TARGET_LEVEL' });
  }

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

  // --- renewal: минимальная валидация доступа ---
  if (goalMode === 'RENEWAL') {
    const activeCertificate = await prisma.certificate.findFirst({
      where: {
        userId: id,
        expiresAt: { gte: new Date() },
      },
      select: { id: true },
    });

    if (!activeCertificate) {
      return reply.code(400).send({ error: 'RENEWAL_NOT_AVAILABLE' });
    }

    if (dbUser.targetLevel !== null) {
      return reply.code(400).send({ error: 'TARGET_ALREADY_SELECTED' });
    }
  }

  // --- валидация цели ---
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

    if (!isAdmin) {
      const allowedTargets = getAllowedTargetsByMode(goalMode, activeGroupName);

      if (goalMode === 'CERTIFICATION') {
        const noCertificationTargets =
          activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';

        if (noCertificationTargets) {
          return reply.code(400).send({ error: 'NO_TARGET_FOR_SUPERVISOR' });
        }
      }

      if (!allowedTargets.includes(targetLevel)) {
        return reply.code(400).send({
          error: goalMode === 'RENEWAL' ? 'RENEWAL_TARGET_NOT_ALLOWED' : 'TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP',
        });
      }
    }
  }

  // lock активен, если цель уже стояла и зафиксирована на текущем ранге
  const lockedNow =
    dbUser.targetLevel !== null &&
    dbUser.targetLockRank !== null &&
    dbUser.targetLockRank === activeRank;

  // если ничего не меняется — короткий выход
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
      goalMode,
    });
  }

  const adminList = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  const adminIds = adminList.map((a) => a.id);

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
        const activeModeRu = activeCycle.type === CycleType.RENEWAL ? 'ресертификации' : 'сертификации';

        await tx.certificationCycle.update({
          where: { id: activeCycle.id },
          data: {
            status: 'ABANDONED',
            endedAt: new Date(),
            abandonedReason: `Сброс активной цели ${activeModeRu} пользователем/админом`,
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

    return reply.send({ ...updated, resetCount, goalMode });
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

  const cycleType = goalMode === 'RENEWAL' ? CycleType.RENEWAL : CycleType.CERTIFICATION;
  const modeRu = getModeRu(goalMode);

  const { updated, resetCount } = await prisma.$transaction(async (tx) => {
    const activeCycle = await tx.certificationCycle.findFirst({
      where: { userId: id, status: 'ACTIVE' },
      select: { id: true, targetLevel: true, type: true },
    });

    if (activeCycle) {
      const prevModeRu = activeCycle.type === CycleType.RENEWAL ? 'ресертификация' : 'сертификация';

      await tx.certificationCycle.update({
        where: { id: activeCycle.id },
        data: {
          status: 'ABANDONED',
          endedAt: new Date(),
          abandonedReason: `Смена цели: ${prevModeRu} ${activeCycle.targetLevel} → ${modeRu} ${targetLevel}`,
        },
      });
    }

    await tx.certificationCycle.create({
      data: {
        userId: id,
        targetLevel,
        type: cycleType,
        status: 'ACTIVE',
        requirementsSnapshot,
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
        comment: `Сброшено из-за смены цели на ${modeRu}: ${targetLevel}`,
      },
    });

    if (adminIds.length) {
      const targetName = TARGET_RU_BY_LEVEL[targetLevel];
      const message =
        `Пользователь ${dbUser.fullName ?? dbUser.email ?? dbUser.id} ` +
        `изменил цель на «${targetName}» (${modeRu}). Сброшено платежей: ${reset.count}.`;

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

  return reply.send({ ...updated, resetCount, goalMode });
}
