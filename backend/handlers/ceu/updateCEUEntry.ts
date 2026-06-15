// handlers/ceu/updateCEUEntryHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { createNotification } from '../../utils/notifications';

const UPLOAD_DIR = process.env.UPLOAD_DIR;

interface UpdateCEUEntryRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    rejectedReason?: string;
    deleteFile?: boolean;
    notify?: boolean;
    notifyUser?: boolean;
  };
}

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

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
  const { status, rejectedReason, deleteFile = false } = req.body;
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
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!entry) return reply.code(404).send({ error: 'Запись не найдена' });

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

  const res = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.cEUEntry.updateMany({
      where: { id, status: { not: 'SPENT' } },
      data: {
        status,
        reviewedAt: new Date(),
        rejectedReason: status === 'REJECTED' ? reason : null,
        reviewerId,
      },
    });

    if (updateResult.count === 0) return updateResult;

    if (status === 'REJECTED' && deleteFile && entry.record.fileId) {
      await tx.cEUEntry.updateMany({
        where: {
          recordId: entry.record.id,
          id: { not: id },
          status: { not: 'SPENT' },
        },
        data: {
          status,
          reviewedAt: new Date(),
          rejectedReason: reason,
          reviewerId,
        },
      });

      const file = await tx.uploadedFile.findUnique({
        where: { fileId: entry.record.fileId },
        select: { id: true, fileId: true },
      });

      await tx.cEURecord.update({
        where: { id: entry.record.id },
        data: { fileId: null },
      });

      if (file) {
        await tx.uploadedFile.delete({ where: { id: file.id } });
        fileIdToDelete = file.fileId;
      }
    }

    return updateResult;
  });

  if (res.count === 0) {
    return reply.code(400).send({ error: 'Статус SPENT необратим' });
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
            : deleteFile
              ? 'Отклонил CEU-баллы и удалил файл'
              : 'Отклонил CEU-баллы',
        details: [
          `Запись: ${entry.record.eventName || entry.record.id}`,
          `Категория: ${entry.category}`,
          `Баллы: ${entry.value}`,
          status === 'REJECTED' ? `Причина: ${reason}` : null,
          deleteFile ? 'Файл удален' : null,
          notifyUser ? 'Пользователь уведомлен' : 'Без уведомления',
        ]
          .filter(Boolean)
          .join('; '),
      },
    });

    if (notifyUser) {
      await createNotification({
        userId: entry.record.userId,
        type: NotificationType.CEU,
        message:
          status === 'CONFIRMED'
            ? 'Ваши CEU-баллы подтверждены'
            : `Ваши CEU-баллы отклонены: ${reason}`,
        link: '/ceu/points?panel=history',
      });
    }
  } catch (err) {
    req.log.error(err, 'CEU_REVIEW side effects failed');
  }

  return reply.send({
    success: true,
    updated: {
      id,
      status,
      rejectedReason: status === 'REJECTED' ? reason : null,
      fileDeleted: !!fileIdToDelete,
      notified: notifyUser,
    },
  });
}
