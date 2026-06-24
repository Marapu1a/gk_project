// src/handlers/admin/ceu/updateUserCEUMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { CycleStatus } from '@prisma/client';
import { logAdminUserAction } from '../../../utils/adminUserActionLog';

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

const categoryLabels: Record<CEUCategory, string> = {
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
  GENERAL: 'Общие',
};

// Все админские корректировки CEU копятся в одной выделенной записи цикла —
// так они отделены от реальных тренингов и видны в истории как «корректировка».
const CEU_CORRECTION_EVENT_NAME = 'Корректировка CEU-баллов';

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
    select: { id: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
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
    // Удаляем все записи этой категории+статуса (включая прошлую корректировку).
    await tx.cEUEntry.deleteMany({
      where: { record: { userId, cycleId: activeCycle.id }, category, status },
    });

    // Находим/создаём выделенную запись корректировки (по стабильному имени).
    const now = new Date();
    let record = await tx.cEURecord.findFirst({
      where: {
        userId,
        cycleId: activeCycle.id,
        eventName: CEU_CORRECTION_EVENT_NAME,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      record = await tx.cEURecord.create({
        data: {
          userId,
          cycleId: activeCycle.id,
          eventName: CEU_CORRECTION_EVENT_NAME,
          eventDate: now,
        },
      });
    } else {
      // Обновляем дату записи на момент последней корректировки.
      await tx.cEURecord.update({ where: { id: record.id }, data: { eventDate: now } });
    }

    // Создаём запись-корректировку всегда (в т.ч. для значения 0),
    // чтобы «было → стало» оставалось видимым в истории.
    await tx.cEUEntry.create({
      data: {
        recordId: record.id,
        category,
        value,
        status,
        isAdminCorrection: true,
        previousValue: current,
        reviewerId: req.user.userId,
        reviewedAt: now,
      },
    });
  });

  await logAdminUserAction({
    userId,
    adminId: req.user.userId,
    action: 'Корректировка CEU-баллов',
    details: `${categoryLabels[category] ?? category}: ${current} -> ${value}`,
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
