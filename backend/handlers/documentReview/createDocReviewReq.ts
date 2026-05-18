import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { notifyAdmins } from '../../utils/notifications';
import { recalculateDocumentReviewRequestStatus } from '../documentReviewAdmin/documentReviewFileStatusUtils';

export async function createDocReviewReq(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const { fileIds, comment } = req.body as {
    fileIds: string[];
    comment?: string;
  };

  // Защита от пустого списка файлов
  if (!fileIds || fileIds.length === 0) {
    return reply.code(400).send({ error: 'Не выбраны файлы для проверки' });
  }

  // 1) Ищем последнюю подтверждённую заявку (её будем дополнять при необходимости)
  const existingConfirmed = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId, status: 'CONFIRMED' },
    orderBy: { submittedAt: 'desc' },
  });

  // 2) Проверка файлов (общая часть)
  const files = await prisma.uploadedFile.findMany({
    where: {
      id: { in: fileIds },
      userId: user.userId,
    },
  });

  if (files.length !== fileIds.length) {
    return reply
      .code(400)
      .send({ error: 'Некоторые файлы не найдены или вам не принадлежат' });
  }

  if (files.some((f) => f.type === null)) {
    return reply
      .code(400)
      .send({ error: 'У всех файлов должен быть выбран тип документа' });
  }

  const trimmedComment = comment?.trim() || null;

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { email: true },
  });

  const notifyDocumentReviewAdmins = async () => {
    try {
      await notifyAdmins({
        type: NotificationType.DOCUMENT,
        message: `Новая заявка на проверку документов от ${currentUser?.email ?? 'пользователя'}`,
        link: '/admin/document-review',
        excludeUserId: user.userId,
      });
    } catch (err) {
      req.log.error(err, 'DOCUMENT_REVIEW_CREATE notification failed');
    }
  };

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });

  if (activeCycle) {
    const request = await prisma.$transaction(async (tx) => {
      const existingForCycle = await tx.documentReviewRequest.findFirst({
        where: { userId: user.userId, cycleId: activeCycle.id },
        orderBy: { submittedAt: 'desc' },
      });

      const targetRequest =
        existingForCycle ??
        (await tx.documentReviewRequest.create({
          data: {
            userId: user.userId,
            cycleId: activeCycle.id,
            comment: trimmedComment,
          },
        }));

      await tx.uploadedFile.updateMany({
        where: { id: { in: fileIds }, userId: user.userId },
        data: { requestId: targetRequest.id },
      });

      await tx.documentReviewFile.createMany({
        data: files.map((file) => ({
          requestId: targetRequest.id,
          fileId: file.id,
          type: file.type,
        })),
        skipDuplicates: true,
      });

      await tx.documentReviewRequest.update({
        where: { id: targetRequest.id },
        data: {
          submittedAt: new Date(),
          comment: trimmedComment,
          reviewerEmail: null,
        },
      });

      return recalculateDocumentReviewRequestStatus(tx, targetRequest.id);
    });

    await notifyDocumentReviewAdmins();

    return reply.code(200).send(request);
  }

  // 4) Legacy-путь без активного цикла: сохраняем старую защиту от второй активной заявки.
  const existingUnconfirmed = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId, status: 'UNCONFIRMED' },
  });

  if (existingUnconfirmed) {
    return reply.code(400).send({ error: 'У вас уже есть активная заявка' });
  }

  // 4) Если есть подтверждённая заявка — дополняем её и возвращаем в статус UNCONFIRMED
  if (existingConfirmed) {
    const updatedReq = await prisma.$transaction(async (tx) => {
      // привязываем новые файлы к существующей заявке
      await tx.uploadedFile.updateMany({
        where: { id: { in: fileIds }, userId: user.userId },
        data: { requestId: existingConfirmed.id },
      });

      await tx.documentReviewFile.createMany({
        data: files.map((file) => ({
          requestId: existingConfirmed.id,
          fileId: file.id,
          type: file.type,
        })),
        skipDuplicates: true,
      });

      await tx.documentReviewRequest.update({
        where: { id: existingConfirmed.id },
        data: {
          status: 'UNCONFIRMED',
          submittedAt: new Date(),
          comment: trimmedComment,
          reviewedAt: null,
          reviewerEmail: null,
        },
      });

      return recalculateDocumentReviewRequestStatus(tx, existingConfirmed.id);
    });

    await notifyDocumentReviewAdmins();

    return reply.code(200).send(updatedReq);
  }

  // 5) Иначе создаём НОВУЮ заявку (случай "первый раз" или после REJECTED)
  const reqNew = await prisma.$transaction(async (tx) => {
    const created = await tx.documentReviewRequest.create({
      data: {
        userId: user.userId,
        comment: trimmedComment,
      },
    });

    await tx.uploadedFile.updateMany({
      where: { id: { in: fileIds }, userId: user.userId },
      data: { requestId: created.id },
    });

    await tx.documentReviewFile.createMany({
      data: files.map((file) => ({
        requestId: created.id,
        fileId: file.id,
        type: file.type,
      })),
      skipDuplicates: true,
    });

    return recalculateDocumentReviewRequestStatus(tx, created.id);
  });

  await notifyDocumentReviewAdmins();

  return reply.code(201).send(reqNew);
}
