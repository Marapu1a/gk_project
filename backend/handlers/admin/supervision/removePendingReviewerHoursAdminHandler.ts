import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import {
  NotificationType,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
} from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { createNotification } from '../../../utils/notifications';

interface RemovePendingReviewerHoursRoute extends RouteGenericInterface {
  Params: { relationId: string };
  Body: { notifyUser?: boolean };
}

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];

function typesForKind(kind: ReviewerCandidateKind) {
  return kind === ReviewerCandidateKind.MENTORSHIP ? MENTORSHIP_TYPES : SUPERVISION_TYPES;
}

function notificationTypeForKind(kind: ReviewerCandidateKind) {
  return kind === ReviewerCandidateKind.MENTORSHIP
    ? NotificationType.MENTORSHIP
    : NotificationType.SUPERVISION;
}

function removedReason(kind: ReviewerCandidateKind) {
  return kind === ReviewerCandidateKind.MENTORSHIP
    ? 'Заявка на менторские часы удалена администратором'
    : 'Заявка на часы удалена администратором';
}

function notificationMessage(kind: ReviewerCandidateKind) {
  return kind === ReviewerCandidateKind.MENTORSHIP
    ? 'Администратор убрал зависшую заявку на менторские часы из проверки. При необходимости отправьте часы повторно.'
    : 'Администратор убрал зависшую заявку на часы из проверки. При необходимости отправьте часы повторно.';
}

export async function removePendingReviewerHoursAdminHandler(
  req: FastifyRequest<RemovePendingReviewerHoursRoute>,
  reply: FastifyReply,
) {
  const adminId = req.user?.userId;
  if (!adminId) return reply.code(401).send({ error: 'Не авторизован' });

  const { relationId } = req.params;
  const notifyUser = req.body?.notifyUser === true;

  const relation = await prisma.reviewerCandidateRelation.findUnique({
    where: { id: relationId },
    select: {
      id: true,
      kind: true,
      reviewerId: true,
      candidateId: true,
      cycleId: true,
      reviewer: { select: { email: true, fullName: true } },
      candidate: { select: { email: true, fullName: true } },
    },
  });

  if (!relation) return reply.code(404).send({ error: 'Сотрудничество с проверяющим не найдено' });

  const hourTypes = typesForKind(relation.kind);
  const now = new Date();
  const reason = removedReason(relation.kind);

  const pendingRecords = await prisma.supervisionRecord.findMany({
    where: {
      userId: relation.candidateId,
      cycleId: relation.cycleId,
      hours: {
        some: {
          reviewerId: relation.reviewerId,
          type: { in: hourTypes },
          status: RecordStatus.UNCONFIRMED,
        },
      },
    },
    select: {
      id: true,
      hours: {
        where: {
          reviewerId: relation.reviewerId,
          type: { in: hourTypes },
          status: RecordStatus.UNCONFIRMED,
        },
        select: { id: true },
      },
    },
  });

  const hourIds = pendingRecords.flatMap((record) => record.hours.map((hour) => hour.id));
  if (!hourIds.length) {
    return reply.code(400).send({ error: 'Нет часов на проверке' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supervisionHour.updateMany({
      where: { id: { in: hourIds } },
      data: {
        status: RecordStatus.REJECTED,
        reviewedAt: now,
        reviewedById: adminId,
        rejectedReason: reason,
      },
    });

    await tx.adminUserActionLog.create({
      data: {
        userId: relation.candidateId,
        adminId,
        action:
          relation.kind === ReviewerCandidateKind.MENTORSHIP
            ? 'Удалил зависшие менторские часы'
            : 'Удалил зависшие часы супервизии',
        details: [
          `Проверяющий: ${relation.reviewer.email}`,
          `Записей: ${pendingRecords.length}`,
          `Часовых строк: ${hourIds.length}`,
          notifyUser ? 'Пользователь уведомлен' : 'Без уведомления',
        ].join('; '),
      },
    });
  });

  if (notifyUser) {
    try {
      await createNotification({
        userId: relation.candidateId,
        type: notificationTypeForKind(relation.kind),
        message: notificationMessage(relation.kind),
        link: '/supervision/hours?panel=history',
      });
    } catch (error) {
      req.log.error(error, 'REMOVE_PENDING_SUPERVISION_HOURS notification failed');
    }
  }

  return reply.send({
    success: true,
    notified: notifyUser,
    removedRecordsCount: pendingRecords.length,
    removedHoursCount: hourIds.length,
  });
}
