// src/handlers/examApplications/patchStatus.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { assertStatusTransition, getOrCreateExamApp } from './utils';

type Body = {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;   // опционально, если хочешь логировать причину отклонения
  notify?: boolean;   // опционально: управлять уведомлениями
};

export async function patchExamAppStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.params as { userId: string };
  const { status: next } = req.body as Body;

  if (!req.user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  // гарантируем наличие заявки
  const app = await getOrCreateExamApp(userId);
  const current = app.status as Body['status'];

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

  // уведомления при желании (не блокируем основной поток)
  // if (next === 'PENDING' && (req.body as Body).notify !== false) notifyAdmins(...);
  // if ((next === 'APPROVED' || next === 'REJECTED') && (req.body as Body).notify !== false) notifyUser(...);

  return reply.send(updated);
}
