// src/handlers/admin/ceu/updateUserCEUMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { labelCEUCategory, labelCEUStatus } from '../../../utils/labels';
import { z } from 'zod';

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

  // посчитаем текущую сумму
  const grouped = await prisma.cEUEntry.groupBy({
    by: ['category', 'status'],
    where: { record: { userId }, category, status },
    _sum: { value: true },
  });
  const current = grouped[0]?._sum.value ?? 0;

  if (current === value) {
    return reply.send({ ok: true, unchanged: true, current });
  }

  // для простоты god-mode: удалить старые entry и создать один новый
  await prisma.cEUEntry.deleteMany({
    where: { record: { userId }, category, status },
  });

  if (value > 0) {
    // нужен CEURecord для связи
    let record = await prisma.cEURecord.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      record = await prisma.cEURecord.create({
        data: {
          userId,
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

  return reply.send({ ok: true, category, status, newValue: value });
}
