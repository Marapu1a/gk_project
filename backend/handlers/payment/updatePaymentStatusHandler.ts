// handlers/payment/updatePaymentStatusHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updatePaymentSchema } from '../../schemas/updatePaymentSchema';

type AuthUser = {
  userId: string;
  role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
};

export async function updatePaymentStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as AuthUser | undefined;
  const { id } = req.params as { id: string };

  if (!user) {
    return reply.code(401).send({ error: 'Требуется авторизация' });
  }

  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Некорректные данные',
      details: parsed.error.flatten(),
    });
  }

  const { status, comment } = parsed.data;

  const dbPayment = await prisma.payment.findUnique({ where: { id } });

  if (!dbPayment) {
    return reply.code(404).send({ error: 'Платёж не найден' });
  }

  if (user.role !== 'ADMIN' && dbPayment.userId !== user.userId) {
    return reply.code(403).send({ error: 'Нет доступа к этому платежу' });
  }

  if (user.role !== 'ADMIN') {
    const isAllowedUserTransition =
      (dbPayment.status === 'UNPAID' && status === 'PENDING') ||
      (dbPayment.status === 'PENDING' && status === 'UNPAID');

    if (!isAllowedUserTransition) {
      return reply.code(403).send({
        error: 'Пользователь может только отправить платёж на проверку или отменить свой запрос',
      });
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === 'PAID' ? now : status === 'UNPAID' ? null : dbPayment.confirmedAt,
        comment,
      },
    });

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
          confirmedAt: now,
          comment: 'Активировано пакетной оплатой',
        },
      });

      activated = res.count;
    }

    return { updated, activated };
  });

  return reply.send({
    payment: result.updated,
    activatedCount: result.activated,
  });
}
