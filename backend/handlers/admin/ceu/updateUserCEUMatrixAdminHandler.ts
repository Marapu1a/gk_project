// src/handlers/admin/ceu/updateUserCEUMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { CycleStatus, CycleType, TargetLevel } from '@prisma/client';
import {
  ceuRequirementsByGroup,
  renewalCeuRequirementsByGroup,
  type CEUSummary,
} from '../../../utils/ceuRequirements';

type CEUCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
type CEUStatus = 'CONFIRMED' | 'SPENT' | 'REJECTED';

interface UpdateUserCEUMatrixRoute extends RouteGenericInterface {
  Params: { userId: string };
  Body: {
    category: CEUCategory;
    status: CEUStatus;
    value: number; // новое целевое значение суммы
    notifyUser?: boolean;
  };
}

const bodySchema = z.object({
  category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
  status: z.enum(['CONFIRMED', 'SPENT', 'REJECTED']),
  value: z.number().min(0),
  notifyUser: z.boolean().optional().default(false),
});

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const REQUIRED_KEY_BY_CATEGORY: Record<CEUCategory, keyof Omit<CEUSummary, 'total'>> = {
  ETHICS: 'ethics',
  CULTURAL_DIVERSITY: 'cultDiver',
  SUPERVISION: 'supervision',
  GENERAL: 'general',
};

export async function updateUserCEUMatrixAdminHandler(
  req: FastifyRequest<UpdateUserCEUMatrixRoute>,
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
  const { category, status, value, notifyUser } = parsed.data;
  if (status !== 'CONFIRMED') {
    return reply.code(400).send({ error: 'Админская корректировка доступна только для подтвержденных CEU-баллов' });
  }

  // ACTIVE cycle обязателен: правим CEU только в рамках активного цикла
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const groupName = RU_BY_LEVEL[activeCycle.targetLevel];
  const requirements =
    activeCycle.type === CycleType.RENEWAL
      ? renewalCeuRequirementsByGroup[groupName]
      : ceuRequirementsByGroup[groupName];
  const maxValue = requirements?.[REQUIRED_KEY_BY_CATEGORY[category]] ?? 0;
  if (value > maxValue) {
    return reply.code(400).send({
      error: `Нельзя сохранить больше ${maxValue} CEU-баллов для этой категории`,
      maxValue,
    });
  }

  // посчитаем текущую сумму (ТОЛЬКО ACTIVE cycle)
  const grouped = await prisma.cEUEntry.groupBy({
    by: ['category', 'status'],
    where: { record: { userId, cycleId: activeCycle.id }, category, status },
    _sum: { value: true },
  });
  const current = grouped[0]?._sum.value ?? 0;

  if (current === value) {
    return reply.send({ ok: true, unchanged: true, current, cycleId: activeCycle.id });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cEUEntry.deleteMany({
      where: { record: { userId, cycleId: activeCycle.id }, category, status },
    });

    if (value <= 0) return;

    let record = await tx.cEURecord.findFirst({
      where: { userId, cycleId: activeCycle.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      record = await tx.cEURecord.create({
        data: {
          userId,
          cycleId: activeCycle.id,
          eventName: 'Корректировка CEU-баллов',
          eventDate: new Date(),
        },
      });
    }

    await tx.cEUEntry.create({
      data: {
        recordId: record.id,
        category,
        value,
        status,
        reviewerId: req.user.userId,
        reviewedAt: new Date(),
      },
    });
  });

  if (notifyUser) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'CEU',
        message: 'Ваши CEU-баллы были скорректированы администратором.',
        link: '/ceu/points?panel=history',
      },
    });
  }

  return reply.send({ ok: true, category, status, newValue: value, cycleId: activeCycle.id, notified: notifyUser });
}
