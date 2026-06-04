import { PaymentStatus, PaymentType, TargetLevel } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

async function getActiveCycle(userId: string) {
  return prisma.certificationCycle.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
}

export async function getOrCreateExamApp(userId: string) {
  const activeCycle = await getActiveCycle(userId);

  const existing = await prisma.examApplication.findFirst({
    where: {
      userId,
      cycleId: activeCycle?.id ?? null,
    },
  });

  if (existing) return existing;

  return prisma.examApplication.create({
    data: {
      userId,
      cycleId: activeCycle?.id ?? null,
      status: 'NOT_SUBMITTED' as ExamStatus,
    },
  });
}

export function assertStatusTransition(params: {
  actorRole: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  actorUserId: string;
  targetUserId: string;
  current: ExamStatus;
  next: ExamStatus;
  manual?: boolean;
}) {
  const { actorRole, actorUserId, targetUserId, current, next, manual } = params;

  // Пользователь (не админ) — только отправка/переотправка
  if (actorRole !== 'ADMIN') {
    if (actorUserId !== targetUserId) throw new Error('FORBIDDEN');

    const allowedUser =
      next === 'PENDING' && (current === 'NOT_SUBMITTED' || current === 'REJECTED');

    if (!allowedUser) throw new Error('INVALID_TRANSITION');
    return;
  }

  // Ручник в админке деталей пользователя: админ может выставить любой статус
  // заявки активного цикла без пляски с переходами.
  if (manual) return;

  // ADMIN:
  // PENDING -> APPROVED
  // Любую неотклоненную заявку можно отклонить с комментарием: это нужно
  // для старых зависших заявок после смены логики.
  // REJECTED -> NOT_SUBMITTED (открыть путь к повторной отправке)
  const allowedAdmin =
    (current === 'PENDING' && next === 'APPROVED') ||
    (next === 'REJECTED' && current !== 'REJECTED') ||
    (current === 'REJECTED' && next === 'NOT_SUBMITTED');

  if (!allowedAdmin) throw new Error('INVALID_TRANSITION');
}

export async function userHasPaidExam(userId: string) {
  // Ищем последний платеж EXAM_ACCESS со статусом PAID
  const last = await prisma.payment.findFirst({
    where: { userId, type: 'EXAM_ACCESS', status: 'PAID' },
    orderBy: { confirmedAt: 'desc' },
    select: { id: true },
  });
  return Boolean(last);
}

export async function getMissingExamPaymentTypes(userId: string): Promise<PaymentType[]> {
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { targetLevel: true },
  });

  if (!activeCycle) {
    return [PaymentType.REGISTRATION, PaymentType.DOCUMENT_REVIEW, PaymentType.EXAM_ACCESS];
  }

  const payments = await prisma.payment.findMany({
    where: {
      userId,
      status: PaymentStatus.PAID,
      OR: [{ targetLevel: activeCycle.targetLevel }, { targetLevel: null }],
      type: {
        in: [
          PaymentType.FULL_PACKAGE,
          PaymentType.REGISTRATION,
          PaymentType.DOCUMENT_REVIEW,
          PaymentType.EXAM_ACCESS,
        ],
      },
    },
    select: { type: true },
  });

  const paidTypes = new Set(payments.map((payment) => payment.type));

  if (paidTypes.has(PaymentType.FULL_PACKAGE)) {
    return [];
  }

  const requiredTypes =
    activeCycle.targetLevel === TargetLevel.SUPERVISOR
      ? [PaymentType.DOCUMENT_REVIEW, PaymentType.EXAM_ACCESS]
      : [PaymentType.REGISTRATION, PaymentType.DOCUMENT_REVIEW, PaymentType.EXAM_ACCESS];

  return requiredTypes.filter((type) => !paidTypes.has(type));
}
