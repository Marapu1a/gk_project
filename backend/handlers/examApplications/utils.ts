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

  // USER ограничения
  if (actorRole !== 'ADMIN') {
    if (actorUserId !== targetUserId) throw new Error('FORBIDDEN');
    // юзер может только NOT_SUBMITTED -> PENDING
    const ok = current === 'NOT_SUBMITTED' && next === 'PENDING';
    if (!ok) throw new Error('INVALID_TRANSITION');
    return;
  }

  // ADMIN может:
  // PENDING -> APPROVED|REJECTED
  // REJECTED -> NOT_SUBMITTED (сброс)
  // (админ не переводит в PENDING — это делает юзер)
  const allowed =
    (current === 'PENDING' && (next === 'APPROVED' || next === 'REJECTED')) ||
    (current === 'REJECTED' && next === 'NOT_SUBMITTED');

  if (!allowed) throw new Error('INVALID_TRANSITION');
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
