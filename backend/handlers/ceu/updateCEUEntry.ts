// handlers/ceu/updateCEUEntryHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { createNotification } from '../../utils/notifications';
import { reportOperationalFailure } from '../../lib/errorMonitoring';
import { getCeuReviewTransitionError } from '../../domain/ceu/reviewPolicy';

import { UPLOAD_ROOT } from '../../config/storage';

interface UpdateCEUEntryRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
    notify?: boolean;
    notifyUser?: boolean;
  };
}

class IrreversibleCeuReviewError extends Error {}

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_ROOT;

  try {
    await fs.unlink(path.join(baseDir, fileId));
  } catch {
    // Для CEU-истории не критично: файл мог уже отсутствовать.
  }
}

export async function updateCEUEntryHandler(
  req: FastifyRequest<UpdateCEUEntryRoute>,
  reply: FastifyReply
) {
  const { id } = req.params;
  const { status, rejectedReason } = req.body;
  const notifyUser = req.body.notifyUser ?? req.body.notify ?? true;
  const reviewerId = req.user?.userId;
  const reviewerRole = req.user?.role;

  if (!reviewerId || reviewerRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор может проверять CEU-баллы' });
  }

  if (status !== 'CONFIRMED' && status !== 'REJECTED') {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const reason = (rejectedReason ?? '').trim();
  if (status === 'REJECTED' && !reason) {
    return reply.code(400).send({ error: 'Причина отклонения обязательна' });
  }

  const entry = await prisma.cEUEntry.findUnique({
    where: { id },
    select: {
      status: true,
      category: true,
      value: true,
      record: {
        select: {
          id: true,
          userId: true,
          cycleId: true,
          fileId: true,
          eventName: true,
          entries: {
            select: {
              id: true,
              category: true,
              value: true,
              status: true,
            },
          },
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!entry) return reply.code(404).send({ error: 'Запись не найдена' });

  const transitionError = getCeuReviewTransitionError(
    entry.record.entries.map((recordEntry) => recordEntry.status),
  );
  if (transitionError) {
    return reply.code(409).send({ error: transitionError });
  }

  if (entry.record.userId === reviewerId) {
    return reply.code(403).send({ error: 'Нельзя редактировать свои записи' });
  }

  if (!entry.record.cycleId) {
    return reply.code(400).send({ error: 'CEU_NOT_LINKED_TO_CYCLE' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: entry.record.userId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!activeCycle || activeCycle.id !== entry.record.cycleId) {
    return reply.code(400).send({ error: 'CEU_NOT_IN_ACTIVE_CYCLE' });
  }

  let fileIdToDelete: string | null = null;
  let fileDetached = false;

  try {
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.cEUEntry.updateMany({
        where: {
          recordId: entry.record.id,
          status:
            status === 'CONFIRMED'
              ? 'UNCONFIRMED'
              : { in: ['UNCONFIRMED', 'CONFIRMED'] },
        },
        data: {
          status,
          reviewedAt: new Date(),
          rejectedReason: status === 'REJECTED' ? reason : null,
          reviewerId,
        },
      });

      if (updateResult.count !== entry.record.entries.length) {
        throw new IrreversibleCeuReviewError();
      }

      if (status === 'REJECTED' && entry.record.fileId) {
        const file = await tx.uploadedFile.findUnique({
          where: { fileId: entry.record.fileId },
          select: {
            id: true,
            fileId: true,
            requestId: true,
            certificate: { select: { id: true } },
            supervisionContract: { select: { id: true } },
            _count: { select: { documentReviewFiles: true } },
          },
        });

        await tx.cEURecord.update({
          where: { id: entry.record.id },
          data: { fileId: null },
        });
        fileDetached = true;

        if (file) {
          const otherCEURecordsWithSameFile = await tx.cEURecord.count({
            where: { fileId: file.fileId },
          });
          const canDeleteUploadedFile =
            otherCEURecordsWithSameFile === 0 &&
            file._count.documentReviewFiles === 0 &&
            !file.requestId &&
            !file.certificate &&
            !file.supervisionContract;

          if (canDeleteUploadedFile) {
            await tx.uploadedFile.delete({ where: { id: file.id } });
            fileIdToDelete = file.fileId;
          }
        }
      }

      return updateResult;
    });
  } catch (error) {
    if (error instanceof IrreversibleCeuReviewError) {
      return reply.code(409).send({ error: 'CEU_REJECTION_IRREVERSIBLE' });
    }
    throw error;
  }

  if (fileIdToDelete) {
    await deletePhysicalFile(fileIdToDelete);
  }

  try {
    await prisma.adminUserActionLog.create({
      data: {
        userId: entry.record.userId,
        adminId: reviewerId,
        action:
          status === 'CONFIRMED'
            ? 'Подтвердил CEU-баллы'
            : 'Отклонил CEU-заявку',
        details: [
          `Запись: ${entry.record.eventName || entry.record.id}`,
          `Категории: ${entry.record.entries.map((item) => item.category).join(', ')}`,
          `Всего баллов: ${entry.record.entries.reduce((sum, item) => sum + item.value, 0)}`,
          status === 'REJECTED' ? `Причина: ${reason}` : null,
          fileDetached
            ? fileIdToDelete
              ? 'Файл отвязан от заявки и удален из хранилища'
              : 'Файл отвязан от заявки; общий файл сохранен'
            : null,
          notifyUser ? 'Пользователь уведомлен' : 'Без уведомления',
        ]
          .filter(Boolean)
          .join('; '),
      },
    });

  } catch (err) {
    reportOperationalFailure(
      'ceu_review_action_log',
      err,
      { userId: entry.record.userId, recordId: entry.record.id, requestId: req.id },
      req.log,
    );
  }

  let notificationCreated = false;
  if (notifyUser) {
    try {
      await createNotification({
        userId: entry.record.userId,
        type: NotificationType.CEU,
        message:
          status === 'CONFIRMED'
            ? 'Ваши CEU-баллы подтверждены'
            : `Ваши CEU-баллы отклонены: ${reason}`,
        link: '/ceu/points?panel=history',
      });
      notificationCreated = true;
    } catch (err) {
      reportOperationalFailure(
        'ceu_review_notification',
        err,
        { userId: entry.record.userId, recordId: entry.record.id, requestId: req.id },
        req.log,
      );
    }
  }

  return reply.send({
    success: true,
    updated: {
      id: entry.record.id,
      status,
      rejectedReason: status === 'REJECTED' ? reason : null,
      fileDeleted: !!fileIdToDelete,
      fileDetached,
      notified: notificationCreated,
    },
  });
}
