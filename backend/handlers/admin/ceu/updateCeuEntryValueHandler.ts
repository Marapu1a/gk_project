import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';

const bodySchema = z.object({
  value: z.number().positive(), // без верхнего лимита
});

export async function updateCeuEntryValueHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string; role: 'ADMIN' | 'REVIEWER' | 'STUDENT' } | undefined;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const { entryId } = req.params as { entryId: string };
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  // нужно знать, чей это entry — для нотификации
  const entryBefore = await prisma.cEUEntry.findUnique({
    where: { id: entryId },
    include: { record: true },
  });
  if (!entryBefore) return reply.code(404).send({ error: 'Запись не найдена' });

  const { value } = parsed.data;

  const updated = await prisma.cEUEntry.update({
    where: { id: entryId },
    data: {
      value,
      status: 'CONFIRMED',
      reviewerId: user.userId,
      reviewedAt: new Date(),
      rejectedReason: null,
    },
  });

  // уведомление пользователю
  await prisma.notification.create({
    data: {
      userId: entryBefore.record.userId,
      type: 'CEU',
      message: `Изменены CEU-баллы: ${value} — ${entryBefore.record.eventName}`,
      link: '/history',
    },
  });

  return reply.send({ ok: true, entry: updated });
}
