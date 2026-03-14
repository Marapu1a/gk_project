// src/handlers/admin/ceu/updateUserCEUMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { labelCEUCategory, labelCEUStatus } from '../../../utils/labels';
import { z } from 'zod';
import { CycleStatus } from '@prisma/client';

type CEUCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
type CEUStatus = 'CONFIRMED' | 'SPENT' | 'REJECTED';

interface UpdateUserCEUMatrixRoute extends RouteGenericInterface {
  Params: { userId: string };
  Body: {
    category: CEUCategory;
    status: CEUStatus;
    value: number; // новое целевое значение суммы
  };
}

const bodySchema = z.object({
  category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
  status: z.enum(['CONFIRMED', 'SPENT', 'REJECTED']),
  value: z.number().min(0),
});

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
  const { category, status, value } = parsed.data;

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

  // god-mode: удалить старые entry в этой ячейке (ТОЛЬКО ACTIVE cycle)
  await prisma.cEUEntry.deleteMany({
    where: { record: { userId, cycleId: activeCycle.id }, category, status },
  });

  if (value > 0) {
    // CEURecord строго в ACTIVE cycle
    let record = await prisma.cEURecord.findFirst({
      where: { userId, cycleId: activeCycle.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      record = await prisma.cEURecord.create({
        data: {
          userId,
          cycleId: activeCycle.id,
          eventName: 'God-mode update',
          eventDate: new Date(),
        },
      });
    }

    await prisma.cEUEntry.create({
      data: {
        recordId: record.id,
        category,
        value,
        status,
        reviewerId: req.user.userId,
        reviewedAt: new Date(),
      },
    });
  }

  // уведомление
  await prisma.notification.create({
    data: {
      userId,
      type: 'CEU',
      message: `Ваши CEU-баллы (${labelCEUCategory(category)}, ${labelCEUStatus(status)}) были изменены администратором.`,
      link: '/history',
    },
  });

  return reply.send({ ok: true, category, status, newValue: value, cycleId: activeCycle.id });
}
