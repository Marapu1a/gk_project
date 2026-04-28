// src/handlers/examApplications/patchStatus.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { assertStatusTransition, getOrCreateExamApp } from './utils';
import { NotificationType } from '@prisma/client';
import { createNotification, notifyAdmins } from '../../utils/notifications';

type Body = {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;   // опционально, если хочешь логировать причину отклонения
  notify?: boolean;   // опционально: управлять уведомлениями
};

export async function patchExamAppStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.params as { userId: string };
  const { status: next, comment = '' } = req.body as Body;

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
    });
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return reply.code(403).send({ error: 'Доступ запрещён' });
    return reply.code(400).send({ error: 'Недопустимый переход статуса' });
  }

  // меняем статус
  const updated = await prisma.examApplication.update({
    where: { userId },
    data: { status: next },
    select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
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
