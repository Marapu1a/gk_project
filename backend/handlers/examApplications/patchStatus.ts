// src/handlers/examApplications/patchStatus.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { assertStatusTransition, getMissingExamPaymentTypes, getOrCreateExamApp } from './utils';
import { NotificationType, PaymentType } from '@prisma/client';
import { createNotification, notifyAdmins } from '../../utils/notifications';

type Body = {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;   // опционально, если хочешь логировать причину отклонения
  notify?: boolean;   // опционально: управлять уведомлениями
  manual?: boolean;   // ручная правка из деталей пользователя
};

const PAYMENT_LABELS: Record<PaymentType, string> = {
  FULL_PACKAGE: 'полный пакет',
  REGISTRATION: 'подача заявки на сертификацию',
  DOCUMENT_REVIEW: 'экспертиза документов',
  EXAM_ACCESS: 'экзамен',
  RENEWAL: 'ресертификация',
};

export async function patchExamAppStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.params as { userId: string };
  const { status: next, comment = '', manual = false } = req.body as Body;

  if (!req.user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  // гарантируем наличие заявки
  const app = await getOrCreateExamApp(userId);
  const current = app.status as Body['status'];
  const isAdminActor = req.user.role === 'ADMIN';

  // проверяем права и допустимость перехода
  try {
    assertStatusTransition({
      actorRole: req.user.role as 'ADMIN' | 'REVIEWER' | 'STUDENT',
      actorUserId: req.user.userId,
      targetUserId: userId,
      current,
      next,
      manual: isAdminActor && manual,
    });
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return reply.code(403).send({ error: 'Доступ запрещён' });
    return reply.code(400).send({ error: 'Недопустимый переход статуса' });
  }

  if (!isAdminActor && next === 'PENDING') {
    const missingPayments = await getMissingExamPaymentTypes(userId);

    if (missingPayments.length) {
      return reply.code(403).send({
        error: 'EXAM_PAYMENTS_REQUIRED',
        message: `Для отправки заявки на экзамен нужны оплаты: ${missingPayments
          .map((type) => PAYMENT_LABELS[type])
          .join(', ')}.`,
        missingPayments,
      });
    }
  }

  // меняем статус
  const updated = await prisma.examApplication.update({
    where: { id: app.id },
    data: { status: next },
    select: {
      id: true,
      userId: true,
      cycleId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { email: true, fullName: true } },
      cycle: { select: { id: true, type: true, status: true, targetLevel: true, startedAt: true } },
    },
  });

  try {
    if (!isAdminActor && next === 'PENDING') {
      const applicant = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      await notifyAdmins({
        type: NotificationType.EXAM,
        message: `Новая заявка на экзамен от ${applicant?.email || 'без email'}`,
        link: '/exam-applications',
        excludeUserId: userId,
      });
    }

    if (isAdminActor) {
      const message =
        next === 'APPROVED'
          ? 'Заявка на экзамен одобрена'
          : next === 'REJECTED'
            ? `Заявка на экзамен отклонена: ${comment.trim()}`
            : next === 'PENDING'
              ? 'Заявка на экзамен переведена на рассмотрение'
              : 'Заявка на экзамен сброшена, можно подать заново';

      await createNotification({
        userId,
        type: NotificationType.EXAM,
        message,
        link: '/dashboard',
      });
    }
  } catch (err) {
    req.log.error(err, 'EXAM_APPLICATION notification failed');
  }

  return reply.send(updated);
}
