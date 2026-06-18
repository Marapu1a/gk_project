// src/handlers/admin/supervision/updateUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import {
  CycleStatus,
  CycleType,
  NotificationType,
  PracticeLevel,
  RecordStatus,
  TargetLevel,
  SupervisionAdminCorrectionKind,
} from '@prisma/client';
import {
  calcAutoRenewalSupervisionHours,
  calcAutoSupervisionHours,
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
} from '../../../utils/supervisionRequirements';
import { logAdminUserAction } from '../../../utils/adminUserActionLog';

// Принимаем legacy-уровни, но внутри работаем только с новыми.
type IncomingLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | 'PRACTICE' | 'SUPERVISION';
type NormalizedLevel = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
type Status = 'CONFIRMED' | 'UNCONFIRMED';

interface Route extends RouteGenericInterface {
  Params: { userId: string };
  Body:
    | { level: IncomingLevel; status: Status; value: number }
    | {
        mode: 'PRACTICE';
        implementing: number;
        programming: number;
        distribution: {
          directIndividual: number;
          directGroup: number;
          nonObservingIndividual: number;
          nonObservingGroup: number;
        };
        notifyUser?: boolean;
      }
    | { mode: 'MENTORSHIP'; value: number; notifyUser?: boolean };
}

const legacyBodySchema = z.object({
  level: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR', 'PRACTICE', 'SUPERVISION']),
  status: z.enum(['CONFIRMED', 'UNCONFIRMED']),
  value: z.number().min(0),
});

const distributionSchema = z.object({
  directIndividual: z.number().min(0),
  directGroup: z.number().min(0),
  nonObservingIndividual: z.number().min(0),
  nonObservingGroup: z.number().min(0),
});

const bodySchema = z.union([
  legacyBodySchema,
  z.object({
    mode: z.literal('PRACTICE'),
    implementing: z.number().min(0),
    programming: z.number().min(0),
    distribution: distributionSchema,
    notifyUser: z.boolean().optional().default(false),
  }),
  z.object({
    mode: z.literal('MENTORSHIP'),
    value: z.number().min(0),
    notifyUser: z.boolean().optional().default(false),
  }),
]);

// Приводим старые INSTRUCTOR/CURATOR к новой схеме PRACTICE/SUPERVISION
function normalizeLevel(lvl: IncomingLevel): NormalizedLevel {
  if (lvl === 'INSTRUCTOR') return 'PRACTICE';
  if (lvl === 'CURATOR') return 'SUPERVISION';
  if (lvl === 'PRACTICE' || lvl === 'SUPERVISION' || lvl === 'SUPERVISOR') return lvl;
  return 'PRACTICE';
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function mapTargetLevel(level: TargetLevel) {
  if (level === TargetLevel.INSTRUCTOR) return 'Инструктор';
  if (level === TargetLevel.CURATOR) return 'Куратор';
  return 'Супервизор';
}

function getRequirements(activeCycle: { targetLevel: TargetLevel; type: CycleType }) {
  const groupName = mapTargetLevel(activeCycle.targetLevel);
  return activeCycle.type === CycleType.RENEWAL
    ? renewalSupervisionRequirementsByGroup[groupName]
    : supervisionRequirementsByGroup[groupName];
}

async function getBonusPracticeHours(userId: string, activeCycle: { targetLevel: TargetLevel; type: CycleType }) {
  if (activeCycle.type === CycleType.RENEWAL || activeCycle.targetLevel !== TargetLevel.SUPERVISOR) {
    return 0;
  }

  const lastCompletedCurator = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.COMPLETED,
      targetLevel: TargetLevel.CURATOR,
    },
    orderBy: { endedAt: 'desc' },
    select: { id: true },
  });

  if (!lastCompletedCurator) return 0;

  const bonusAgg = await prisma.supervisionHour.aggregate({
    where: {
      status: RecordStatus.CONFIRMED,
      type: {
        in: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING, PracticeLevel.PROGRAMMING],
      },
      record: { cycleId: lastCompletedCurator.id },
    },
    _sum: { value: true },
  });

  return bonusAgg._sum.value ?? 0;
}

function getPracticeRuleError(implementing: number, programming: number) {
  const total = implementing + programming;
  if (total <= 0) return null;

  const minEach = total * 0.4;
  if (implementing < minEach || programming < minEach) {
    return 'Часы полевой практики и работы с информацией должны быть в пропорции 40/40.';
  }

  return null;
}

function getDistributionRuleError(params: {
  expectedSupervision: number;
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
  };
}) {
  const { expectedSupervision, distribution } = params;
  const distributionTotal = round2(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );
  const groupTotal = round2(distribution.directGroup + distribution.nonObservingGroup);

  if (expectedSupervision <= 0) {
    return distributionTotal > 0 ? 'Пока расчетная супервизия равна 0, распределять часы нельзя.' : null;
  }

  if (Math.abs(expectedSupervision - distributionTotal) >= 0.01) {
    return 'Сумма распределенных часов должна совпадать с расчетной супервизией.';
  }

  if (groupTotal > expectedSupervision * 0.5) {
    return 'Часов в группе может быть не более 50% от всех часов супервизии.';
  }

  return null;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export async function updateUserSupervisionMatrixAdminHandler(
  req: FastifyRequest<Route>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { userId } = req.params;
  const incoming = parsed.data;

  // --- пользователь и группы
  const userWithGroups = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!userWithGroups) return reply.code(404).send({ error: 'Пользователь не найден' });

  const topGroup = userWithGroups.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank)[0];
  const isSupervisorUser =
    topGroup?.name === 'Супервизор' || topGroup?.name === 'Опытный Супервизор';
  const isBasicSupervisor = topGroup?.name === 'Супервизор';

  // --- активный цикл обязателен (в эпоху циклов правим только внутри него)
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  if ('mode' in incoming && incoming.mode === 'PRACTICE') {
    if (isSupervisorUser) {
      return reply.code(403).send({ error: 'Часы практики у супервизоров не редактируются' });
    }

    const implementing = round2(incoming.implementing);
    const programming = round2(incoming.programming);
    const practiceTotal = round2(implementing + programming);
    const requirements = getRequirements(activeCycle);
    const practiceRuleError = getPracticeRuleError(implementing, programming);
    if (practiceRuleError) return reply.code(400).send({ error: practiceRuleError });

    const groupName = mapTargetLevel(activeCycle.targetLevel);
    const bonusPractice = await getBonusPracticeHours(userId, activeCycle);
    const practiceHoursForSupervision = round2(practiceTotal + bonusPractice);
    if (requirements && requirements.practice > 0 && practiceHoursForSupervision > requirements.practice) {
      return reply.code(400).send({
        error: `Нельзя указать больше ${requirements.practice} часов практики для текущего цикла`,
        maxValue: requirements.practice,
      });
    }

    const expectedSupervision =
      activeCycle.type === CycleType.RENEWAL
        ? calcAutoRenewalSupervisionHours({ groupName, practiceHours: practiceHoursForSupervision })
        : calcAutoSupervisionHours({ groupName, practiceHours: practiceHoursForSupervision });
    const cappedExpectedSupervision =
      requirements && requirements.supervision > 0
        ? Math.min(expectedSupervision, requirements.supervision)
        : expectedSupervision;
    const distributionRuleError = getDistributionRuleError({
      expectedSupervision: cappedExpectedSupervision,
      distribution: incoming.distribution,
    });
    if (distributionRuleError) return reply.code(400).send({ error: distributionRuleError });

    await prisma.supervisionAdminCorrection.upsert({
      where: {
        cycleId_kind: {
          cycleId: activeCycle.id,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
        },
      },
      create: {
        userId,
        cycleId: activeCycle.id,
        adminId: req.user.userId,
        kind: SupervisionAdminCorrectionKind.PRACTICE,
        implementing,
        programming,
        directIndividual: incoming.distribution.directIndividual,
        directGroup: incoming.distribution.directGroup,
        nonObservingIndividual: incoming.distribution.nonObservingIndividual,
        nonObservingGroup: incoming.distribution.nonObservingGroup,
        notifyUser: Boolean(incoming.notifyUser),
      },
      update: {
        adminId: req.user.userId,
        implementing,
        programming,
        directIndividual: incoming.distribution.directIndividual,
        directGroup: incoming.distribution.directGroup,
        nonObservingIndividual: incoming.distribution.nonObservingIndividual,
        nonObservingGroup: incoming.distribution.nonObservingGroup,
        notifyUser: Boolean(incoming.notifyUser),
      },
    });

    await logAdminUserAction({
      userId,
      adminId: req.user.userId,
      action: 'Корректировка часов практики и супервизии',
      details:
        `Полевая практика: ${formatHours(implementing)}; ` +
        `работа с информацией: ${formatHours(programming)}; ` +
        `супервизия: ${formatHours(cappedExpectedSupervision)}`,
    });

    if (incoming.notifyUser) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SUPERVISION,
          message: 'Ваши часы практики и супервизии были скорректированы администратором.',
          link: '/supervision/hours?panel=history',
        },
      });
    }

    return reply.send({
      ok: true,
      mode: incoming.mode,
      implementing,
      programming,
      expectedSupervision: cappedExpectedSupervision,
      notified: incoming.notifyUser,
      cycleId: activeCycle.id,
    });
  }

  if ('mode' in incoming && incoming.mode === 'MENTORSHIP') {
    if (!isBasicSupervisor) {
      return reply.code(403).send({ error: 'Менторские часы доступны только супервизорам' });
    }

    const value = round2(incoming.value);
    const requirements = getRequirements(activeCycle);
    const maxValue = requirements?.supervisor ?? 0;

    if (maxValue > 0 && value > maxValue) {
      return reply.code(400).send({
        error: `Нельзя указать больше ${maxValue} часов менторства`,
        maxValue,
      });
    }

    await prisma.supervisionAdminCorrection.upsert({
      where: {
        cycleId_kind: {
          cycleId: activeCycle.id,
          kind: SupervisionAdminCorrectionKind.MENTORSHIP,
        },
      },
      create: {
        userId,
        cycleId: activeCycle.id,
        adminId: req.user.userId,
        kind: SupervisionAdminCorrectionKind.MENTORSHIP,
        mentor: value,
        notifyUser: Boolean(incoming.notifyUser),
      },
      update: {
        adminId: req.user.userId,
        mentor: value,
        notifyUser: Boolean(incoming.notifyUser),
      },
    });

    await logAdminUserAction({
      userId,
      adminId: req.user.userId,
      action: 'Корректировка часов менторства',
      details: `Менторство: ${formatHours(value)}`,
    });

    if (incoming.notifyUser) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.MENTORSHIP,
          message: 'Ваши часы менторства были скорректированы администратором.',
          link: '/supervision/hours?panel=history',
        },
      });
    }

    return reply.send({
      ok: true,
      mode: incoming.mode,
      level: 'SUPERVISOR',
      status: RecordStatus.CONFIRMED,
      newValue: value,
      notified: incoming.notifyUser,
      cycleId: activeCycle.id,
    });
  }

  if (!('level' in incoming)) {
    return reply.code(400).send({ error: 'Неверные данные' });
  }

  const level = normalizeLevel(incoming.level);
  const status = incoming.status as RecordStatus; // CONFIRMED | UNCONFIRMED
  const value = incoming.value;

  // ❌ Супервизию руками больше не трогаем: она считается авто из практики
  if (level === 'SUPERVISION') {
    return reply.code(403).send({
      error: 'Часы супервизии считаются автоматически и не редактируются вручную',
    });
  }

  // --- правила редактирования:
  // до супервизора не даём править менторские,
  // у супервизоров не редактируем PRACTICE агрегатами.
  if (!isSupervisorUser && level === 'SUPERVISOR') {
    return reply.code(403).send({ error: 'Менторские часы недоступны до уровня Супервизор' });
  }
  if (isSupervisorUser && level === 'PRACTICE') {
    return reply.code(403).send({ error: 'Часы практики у супервизоров не редактируются агрегатами' });
  }

  const requirements = getRequirements(activeCycle);
  const maxValue =
    level === 'SUPERVISOR' ? (requirements?.supervisor ?? 0) : (requirements?.practice ?? 0);
  if (status === RecordStatus.CONFIRMED && maxValue > 0 && value > maxValue) {
    return reply.code(400).send({
      error:
        level === 'SUPERVISOR'
          ? `Нельзя указать больше ${maxValue} часов менторства`
          : `Нельзя указать больше ${maxValue} часов практики для текущего цикла`,
      maxValue,
    });
  }

  // --- текущая сумма в ячейке (ТОЛЬКО ACTIVE cycle)
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: { userId, cycleId: activeCycle.id },
      type: level as PracticeLevel,
      status, // CONFIRMED/UNCONFIRMED
    },
    _sum: { value: true },
  });

  const current = (grouped[0]?._sum?.value ?? 0) as number;

  if (current === value) {
    return reply.send({ ok: true, unchanged: true, current, cycleId: activeCycle.id });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supervisionHour.deleteMany({
      where: {
        record: { userId, cycleId: activeCycle.id },
        type: level as PracticeLevel,
        status,
      },
    });

    if (value <= 0) return;

    let record = await tx.supervisionRecord.findFirst({
      where: { userId, cycleId: activeCycle.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      record = await tx.supervisionRecord.create({
        data: { userId, cycleId: activeCycle.id },
      });
    }

    const isConfirmed = status === 'CONFIRMED';

    await tx.supervisionHour.create({
      data: {
        recordId: record.id,
        type: level as PracticeLevel,
        value,
        status,
        reviewerId: req.user.userId,
        reviewedAt: isConfirmed ? new Date() : null,
        rejectedReason: null,
      },
    });
  });

  await logAdminUserAction({
    userId,
    adminId: req.user.userId,
    action: 'Корректировка часов',
    details: `${level}: ${formatHours(current)} -> ${formatHours(value)} (${status})`,
  });

  return reply.send({ ok: true, level, status, newValue: value, cycleId: activeCycle.id });
}
