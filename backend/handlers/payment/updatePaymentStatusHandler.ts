import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updatePaymentSchema } from '../../schemas/updatePaymentSchema';

export async function updatePaymentStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { userId: string; role: 'STUDENT' | 'REVIEWER' | 'ADMIN' } | undefined;
  const { id } = req.params as { id: string };

  if (!user) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const { status, comment } = parsed.data;

  // Берём платёж и валидируем доступ
  const dbPayment = await prisma.payment.findUnique({ where: { id } });
  if (!dbPayment) return reply.code(404).send({ error: 'Платёж не найден' });

  // Не-админ не может менять чужие платежи
  if (user.role !== 'ADMIN' && dbPayment.userId !== user.userId) {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  // Только админ может ставить PAID
  if (status === 'PAID' && user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только админ может подтверждать оплату' });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1) Обновляем текущий платёж
    const updated = await tx.payment.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === 'PAID' ? new Date() : null,
        comment,
      },
    });

    // 2) Если это FULL_PACKAGE -> PAID, активируем остальные
    let activated = 0;
    if (status === 'PAID' && dbPayment.type === 'FULL_PACKAGE') {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: { in: ['DOCUMENT_REVIEW', 'EXAM_ACCESS', 'REGISTRATION'] },
          status: { not: 'PAID' },
        },
        data: {
          status: 'PAID',
          confirmedAt: new Date(),
          comment: 'Активированно пакетной оплатой',
        },
      });
      activated = res.count;
    }

    return { updated, activated };
  });

  return reply.send({ payment: result.updated, activatedCount: result.activated });
}
