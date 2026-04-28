// handlers/payment/updatePaymentStatusHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { NotificationType, PaymentType } from '@prisma/client';
import { updatePaymentSchema } from '../../schemas/updatePaymentSchema';
import { createNotification, notifyAdmins } from '../../utils/notifications';

type AuthUser = {
  userId: string;
  role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
};

function paymentTypeLabel(type: PaymentType) {
  switch (type) {
    case PaymentType.FULL_PACKAGE:
      return 'Пакетная оплата';
    case PaymentType.REGISTRATION:
      return 'Регистрация';
    case PaymentType.DOCUMENT_REVIEW:
      return 'Проверка документов';
    case PaymentType.EXAM_ACCESS:
      return 'Доступ к экзамену';
    case PaymentType.RENEWAL:
      return 'Ресертификация';
    default:
      return 'Оплата';
  }
}

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

  const { status, comment, notify = true } = parsed.data;

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
    let synced = 0;

    const bundledTypes: PaymentType[] = [
      PaymentType.DOCUMENT_REVIEW,
      PaymentType.EXAM_ACCESS,
      PaymentType.REGISTRATION,
    ];

    if (status === 'PAID' && dbPayment.type === 'FULL_PACKAGE') {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: { in: bundledTypes },
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

    if (
      dbPayment.type === 'FULL_PACKAGE' &&
      (status === 'PENDING' || status === 'UNPAID')
    ) {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: { in: bundledTypes },
          status: { not: 'PAID' },
        },
        data: {
          status,
          confirmedAt: null,
          comment:
            status === 'PENDING'
              ? 'Ожидает подтверждения вместе с пакетной оплатой'
              : 'Сброшено после отмены пакетной оплаты',
        },
      });

      synced = res.count;
    }

    return { updated, activated, synced };
  });

  if (notify) {
    try {
      if (user.role !== 'ADMIN' && (status === 'PENDING' || status === 'UNPAID')) {
        const actor = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { email: true },
        });

        await notifyAdmins({
          type: NotificationType.PAYMENT,
          message:
            status === 'PENDING'
              ? `Новая отметка об оплате от ${actor?.email ?? 'пользователя'}`
              : `Пользователь ${actor?.email ?? 'пользователь'} отменил отметку об оплате`,
          link: `/admin/users/${dbPayment.userId}`,
          excludeUserId: dbPayment.userId,
        });
      }

      if (user.role === 'ADMIN' && status === 'PAID' && dbPayment.status !== 'PAID') {
        await createNotification({
          userId: dbPayment.userId,
          type: NotificationType.PAYMENT,
          message:
            dbPayment.type === PaymentType.FULL_PACKAGE
              ? 'Пакетная оплата подтверждена'
              : `Оплата подтверждена: ${paymentTypeLabel(dbPayment.type)}`,
          link: '/dashboard',
        });
      }
    } catch (err) {
      req.log.error(err, 'PAYMENT_STATUS notification failed');
    }
  }

  return reply.send({
    payment: result.updated,
    activatedCount: result.activated,
    syncedCount: result.synced,
  });
}
