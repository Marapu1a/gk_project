import { prisma } from '../../lib/prisma';

export type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export async function getOrCreateExamApp(userId: string) {
  return prisma.examApplication.upsert({
    where: { userId }, // UNIQUE
    update: {},
    create: { userId, status: 'NOT_SUBMITTED' as ExamStatus },
  });
}

export function assertStatusTransition(params: {
  actorRole: 'ADMIN' | 'REVIEWER' | 'STUDENT';
  actorUserId: string;
  targetUserId: string;
  current: ExamStatus;
  next: ExamStatus;
}) {
  const { actorRole, actorUserId, targetUserId, current, next } = params;

  // Пользователь (не админ) — только отправка/переотправка
  if (actorRole !== 'ADMIN') {
    if (actorUserId !== targetUserId) throw new Error('FORBIDDEN');

    const allowedUser =
      next === 'PENDING' && (current === 'NOT_SUBMITTED' || current === 'REJECTED');

    if (!allowedUser) throw new Error('INVALID_TRANSITION');
    return;
  }

  // ADMIN:
  // PENDING -> APPROVED | REJECTED
  // REJECTED -> NOT_SUBMITTED (открыть путь к повторной отправке)
  // (по желанию можешь также разрешить PENDING -> NOT_SUBMITTED)
  const allowedAdmin =
    (current === 'PENDING' && (next === 'APPROVED' || next === 'REJECTED')) ||
    (current === 'REJECTED' && next === 'NOT_SUBMITTED');
  // || (current === 'PENDING' && next === 'NOT_SUBMITTED'); // опционально

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
