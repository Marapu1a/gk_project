// src/handlers/admin/updateSupervisionHour.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { RecordStatus } from '@prisma/client';

const bodySchema = z.object({
  value: z.number().positive(), // без верхнего лимита
});

export async function updateSupervisionHourHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string; role: 'ADMIN' | 'REVIEWER' | 'STUDENT' } | undefined;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const { id } = req.params as { id: string };
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  // нужен owner для уведомления
  const before = await prisma.supervisionHour.findUnique({
    where: { id },
    include: { record: true },
  });
  if (!before) return reply.code(404).send({ error: 'Запись не найдена' });

  const { value } = parsed.data;

  const hour = await prisma.supervisionHour.update({
    where: { id },
    data: {
      value,
      status: RecordStatus.CONFIRMED,
      reviewerId: user.userId,
      reviewedAt: new Date(),
      rejectedReason: null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: before.record.userId,
      type: 'SUPERVISION',
      message: `Изменены часы супервизии: ${value}`,
      link: '/history',
    },
  });

  return reply.send({ ok: true, hour });
}
