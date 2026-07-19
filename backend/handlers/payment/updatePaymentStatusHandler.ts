// handlers/payment/updatePaymentStatusHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { NotificationType, PaymentType, PaymentStatus, Role, TargetLevel } from '@prisma/client';
import { updatePaymentSchema } from '../../schemas/updatePaymentSchema';
import { createNotification, notifyAdmins } from '../../utils/notifications';
import { logAdminUserAction } from '../../utils/adminUserActionLog';
import { reportOperationalFailure } from '../../lib/errorMonitoring';

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

  if (user.role !== Role.ADMIN && dbPayment.userId !== user.userId) {
    return reply.code(403).send({ error: 'Нет доступа к этому платежу' });
  }

  if (user.role !== Role.ADMIN) {
    const isAllowedUserTransition =
      (dbPayment.status === PaymentStatus.UNPAID && status === PaymentStatus.PENDING) ||
      (dbPayment.status === PaymentStatus.PENDING && status === PaymentStatus.UNPAID);

    if (!isAllowedUserTransition) {
      return reply.code(403).send({
        error: 'Пользователь может только отправить платёж на проверку или отменить свой запрос',
      });
    }
  }

  const bundledTypes: PaymentType[] = [
    PaymentType.DOCUMENT_REVIEW,
    PaymentType.EXAM_ACCESS,
    PaymentType.REGISTRATION,
  ];

  if (bundledTypes.includes(dbPayment.type)) {
    const activePackage = await prisma.payment.findFirst({
      where: {
        userId: dbPayment.userId,
        type: PaymentType.FULL_PACKAGE,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PAID] },
        OR: dbPayment.targetLevel
          ? [{ targetLevel: dbPayment.targetLevel }, { targetLevel: null }]
          : [{ targetLevel: null }, { targetLevel: { not: null } }],
      },
      select: { id: true },
    });

    if (activePackage) {
      return reply.code(409).send({
        error: 'Платеж входит в пакет. Сначала отмените пакетную оплату.',
      });
    }
  }

  if (
    dbPayment.type === PaymentType.FULL_PACKAGE &&
    (status === PaymentStatus.PENDING || status === PaymentStatus.PAID)
  ) {
    const paidSeparatePayment = await prisma.payment.findFirst({
      where: {
        userId: dbPayment.userId,
        type: { in: bundledTypes },
        status: PaymentStatus.PAID,
        OR: dbPayment.targetLevel
          ? [{ targetLevel: dbPayment.targetLevel }, { targetLevel: null }]
          : [{ targetLevel: null }, { targetLevel: { not: null } }],
      },
      select: { id: true },
    });

    if (paidSeparatePayment) {
      return reply.code(409).send({
        error: 'Пакетная оплата недоступна: уже принят отдельный платеж.',
      });
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        status,
        requestedAt:
          user.role !== Role.ADMIN && status === PaymentStatus.PENDING
            ? now
            : status === PaymentStatus.UNPAID
              ? null
              : status === PaymentStatus.PAID
                ? dbPayment.requestedAt ?? now
                : dbPayment.requestedAt,
        confirmedAt: status === PaymentStatus.PAID ? now : status === PaymentStatus.UNPAID ? null : dbPayment.confirmedAt,
        comment,
      },
    });

    let activated = 0;
    let synced = 0;
    let linked = 0;

    if (status === PaymentStatus.PAID && dbPayment.type === PaymentType.FULL_PACKAGE) {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: { in: bundledTypes },
          OR: dbPayment.targetLevel
            ? [{ targetLevel: dbPayment.targetLevel }, { targetLevel: null }]
            : [{ targetLevel: null }],
          status: { not: PaymentStatus.PAID },
        },
        data: {
          status: PaymentStatus.PAID,
          targetLevel: dbPayment.targetLevel,
          requestedAt: dbPayment.requestedAt ?? now,
          confirmedAt: now,
          comment: null,
        },
      });

      activated = res.count;
    }

    if (dbPayment.type === PaymentType.FULL_PACKAGE && (status === PaymentStatus.PENDING || status === PaymentStatus.UNPAID)) {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: { in: bundledTypes },
          OR: dbPayment.targetLevel
            ? [{ targetLevel: dbPayment.targetLevel }, { targetLevel: null }]
            : [{ targetLevel: null }],
          status: status === PaymentStatus.PENDING ? { not: PaymentStatus.PAID } : { not: PaymentStatus.UNPAID },
        },
        data: {
          status,
          targetLevel: dbPayment.targetLevel,
          requestedAt: status === PaymentStatus.PENDING ? now : null,
          confirmedAt: null,
          comment: null,
        },
      });

      synced = res.count;
    }

    if (
      dbPayment.type === PaymentType.DOCUMENT_REVIEW &&
      dbPayment.targetLevel === TargetLevel.SUPERVISOR
    ) {
      const res = await tx.payment.updateMany({
        where: {
          userId: dbPayment.userId,
          type: PaymentType.REGISTRATION,
          OR: [{ targetLevel: TargetLevel.SUPERVISOR }, { targetLevel: null }],
        },
        data: {
          status,
          targetLevel: TargetLevel.SUPERVISOR,
          requestedAt:
            status === PaymentStatus.PENDING
              ? now
              : status === PaymentStatus.UNPAID
                ? null
                : dbPayment.requestedAt ?? now,
          confirmedAt: status === PaymentStatus.PAID ? now : null,
          comment: null,
        },
      });

      linked = res.count;
    }

    return { updated, activated, synced, linked };
  });

  if (user.role === Role.ADMIN && dbPayment.status !== status) {
    const action =
      status === PaymentStatus.PAID
        ? 'Подтвердил оплату'
        : status === PaymentStatus.UNPAID
          ? 'Отменил оплату'
          : 'Изменил статус оплаты';

    await logAdminUserAction({
      userId: dbPayment.userId,
      adminId: user.userId,
      action,
      details: [
        paymentTypeLabel(dbPayment.type),
        notify ? 'с уведомлением' : 'без уведомления',
        result.activated ? `активировано платежей пакета: ${result.activated}` : null,
        result.synced ? `синхронизировано платежей пакета: ${result.synced}` : null,
        result.linked ? `синхронизировано связанных платежей: ${result.linked}` : null,
      ]
        .filter(Boolean)
        .join('; '),
    });
  }

  if (notify) {
    try {
      if (user.role !== Role.ADMIN && (status === PaymentStatus.PENDING || status === PaymentStatus.UNPAID)) {
        const actor = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { email: true },
        });

        await notifyAdmins({
          type: NotificationType.PAYMENT,
          message:
            status === PaymentStatus.PENDING
              ? `Новая отметка об оплате от ${actor?.email ?? 'пользователя'}`
              : `Пользователь ${actor?.email ?? 'пользователь'} отменил отметку об оплате`,
          link: `/admin/users/${dbPayment.userId}`,
          excludeUserId: dbPayment.userId,
        });
      }

      if (user.role === Role.ADMIN && status === PaymentStatus.PAID && dbPayment.status !== PaymentStatus.PAID) {
        await createNotification({
          userId: dbPayment.userId,
          type: NotificationType.PAYMENT,
          message:
            dbPayment.type === PaymentType.FULL_PACKAGE
              ? 'Пакетная оплата подтверждена'
              : `Оплата подтверждена: ${paymentTypeLabel(dbPayment.type)}`,
          link: '/dashboard-v2',
        });
      }

      if (user.role === Role.ADMIN && status === PaymentStatus.UNPAID && dbPayment.status !== PaymentStatus.UNPAID) {
        const baseMessage =
          dbPayment.type === PaymentType.FULL_PACKAGE
            ? 'Пакетная оплата отменена'
            : `Оплата отменена: ${paymentTypeLabel(dbPayment.type)}`;

        await createNotification({
          userId: dbPayment.userId,
          type: NotificationType.PAYMENT,
          message: comment ? `${baseMessage}. Комментарий: ${comment}` : baseMessage,
          link: '/dashboard-v2',
        });
      }
    } catch (err) {
      reportOperationalFailure(
        'payment_status_notification',
        err,
        { paymentId: id, userId: dbPayment.userId, nextStatus: status, requestId: req.id },
        req.log,
      );
    }
  }

  return reply.send({
    payment: result.updated,
    activatedCount: result.activated,
    syncedCount: result.synced,
    linkedCount: result.linked,
  });
}
