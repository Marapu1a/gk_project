import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import {
  NotificationType,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
} from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { createNotification } from '../../../utils/notifications';
import { reportOperationalFailure } from '../../../lib/errorMonitoring';

interface RemovePendingReviewerHoursRoute extends RouteGenericInterface {
  Params: { relationId: string; recordId?: string };
  Body: { notifyUser?: boolean; recordId?: string };
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

export function buildPendingRecordsWhere(params: {
  recordId: string | null;
  candidateId: string;
  cycleId: string;
  reviewerId: string;
  hourTypes: PracticeLevel[];
}) {
  return {
    ...(params.recordId ? { id: params.recordId } : {}),
    userId: params.candidateId,
    cycleId: params.cycleId,
    hours: {
      some: {
        reviewerId: params.reviewerId,
        type: { in: params.hourTypes },
        status: RecordStatus.UNCONFIRMED,
      },
    },
  };
}

export async function removePendingReviewerHoursAdminHandler(
  req: FastifyRequest<RemovePendingReviewerHoursRoute>,
  reply: FastifyReply,
) {
  const adminId = req.user?.userId;
  if (!adminId) return reply.code(401).send({ error: 'Не авторизован' });

  const { relationId } = req.params;
  const notifyUser = req.body?.notifyUser === true;
  const recordId = req.params.recordId?.trim() || req.body?.recordId?.trim() || null;

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
    where: buildPendingRecordsWhere({
      recordId,
      candidateId: relation.candidateId,
      cycleId: relation.cycleId,
      reviewerId: relation.reviewerId,
      hourTypes,
    }),
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
    return reply.code(400).send({
      error: recordId ? 'В выбранной заявке нет часов на проверке' : 'Нет часов на проверке',
    });
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
          recordId ? `Заявка: ${recordId}` : 'Все ожидающие заявки связи',
          `Записей: ${pendingRecords.length}`,
          `Часовых строк: ${hourIds.length}`,
          notifyUser ? 'Пользователь уведомлен' : 'Без уведомления',
        ].join('; '),
      },
    });
  });

  let notificationCreated = false;
  if (notifyUser) {
    try {
      await createNotification({
        userId: relation.candidateId,
        type: notificationTypeForKind(relation.kind),
        message: notificationMessage(relation.kind),
        link: '/supervision/hours?panel=history',
      });
      notificationCreated = true;
    } catch (error) {
      reportOperationalFailure(
        'remove_pending_supervision_notification',
        error,
        { relationId, userId: relation.candidateId, requestId: req.id },
        req.log,
      );
    }
  }

  return reply.send({
    success: true,
    notified: notificationCreated,
    removedRecordsCount: pendingRecords.length,
    removedHoursCount: hourIds.length,
  });
}
