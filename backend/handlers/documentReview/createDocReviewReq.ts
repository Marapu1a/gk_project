import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { NotificationType, Prisma } from '@prisma/client';
import { notifyAdmins } from '../../utils/notifications';
import {
  recalculateDocumentReviewRequestStatus,
  resolveDocumentReviewRequestStatus,
} from '../documentReviewAdmin/documentReviewFileStatusUtils';

const allowedDocumentTypes = new Set(['HIGHER_EDUCATION', 'ADDITIONAL_EDUCATION', 'OTHER']);
const MAX_DOCUMENTS_PER_SUBMISSION = 10;

type DocumentPayloadItem = {
  fileId: string;
  type?: string | null;
};

function formatFilesCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} файл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} файла`;
  return `${count} файлов`;
}

function commentsEqual(left?: string | null, right?: string | null) {
  return (left?.trim() || null) === (right?.trim() || null);
}

export async function createDocReviewReq(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const { fileIds: legacyFileIds, documents, comment } = req.body as {
    fileIds?: string[];
    documents?: DocumentPayloadItem[];
    comment?: string;
  };
  const documentItems = Array.isArray(documents) ? documents : [];
  const usesDocumentPayload = documentItems.length > 0;
  const fileIds = usesDocumentPayload
    ? documentItems.map((document) => document.fileId)
    : legacyFileIds ?? [];

  // Защита от пустого списка файлов
  if (!fileIds || fileIds.length === 0) {
    return reply.code(400).send({ error: 'Не выбраны файлы для проверки' });
  }

  if (fileIds.length > MAX_DOCUMENTS_PER_SUBMISSION) {
    return reply.code(400).send({
      error: `Можно отправить максимум ${MAX_DOCUMENTS_PER_SUBMISSION} документов за один раз`,
    });
  }

  if (new Set(fileIds).size !== fileIds.length) {
    return reply.code(400).send({ error: 'Один файл указан несколько раз' });
  }

  const typeByFileId = new Map<string, string>();

  if (usesDocumentPayload) {
    for (const document of documentItems) {
      const type = document.type?.trim();

      if (!type) {
        return reply.code(400).send({ error: 'У всех файлов должен быть выбран тип документа' });
      }

      if (!allowedDocumentTypes.has(type)) {
        return reply.code(400).send({ error: 'Недопустимый тип документа' });
      }

      typeByFileId.set(document.fileId, type);
    }
  }

  // 1) Ищем последнюю подтверждённую заявку по фактическим статусам файлов.
  const existingRequests = await prisma.documentReviewRequest.findMany({
    where: { userId: user.userId },
    orderBy: { submittedAt: 'desc' },
    include: {
      documentFiles: { select: { status: true } },
    },
  });
  const existingConfirmed =
    existingRequests.find((request) => resolveDocumentReviewRequestStatus(request) === 'CONFIRMED') ??
    null;

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

  const filesWithTypes = files.map((file) => ({
    ...file,
    type: typeByFileId.get(file.id) ?? file.type,
  }));

  if (filesWithTypes.some((f) => !f.type)) {
    return reply
      .code(400)
      .send({ error: 'У всех файлов должен быть выбран тип документа' });
  }

  const trimmedComment = comment?.trim() || null;

  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { email: true },
  });

  const notifyDocumentReviewAdmins = async (message: string, requestId: string) => {
    try {
      await notifyAdmins({
        type: NotificationType.DOCUMENT,
        message,
        link: `/admin/document-review/${requestId}`,
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

  const saveDocumentTypes = (tx: Prisma.TransactionClient) =>
    Promise.all(
      Array.from(typeByFileId.entries()).map(([id, type]) =>
        tx.uploadedFile.update({
          where: { id },
          data: { type },
        }),
      ),
    );

  if (activeCycle) {
    const { request, notification } = await prisma.$transaction(async (tx) => {
      await saveDocumentTypes(tx);

      const existingForCycle = await tx.documentReviewRequest.findFirst({
        where: { userId: user.userId, cycleId: activeCycle.id },
        orderBy: { submittedAt: 'desc' },
        select: { id: true, comment: true },
      });

      const targetRequest = existingForCycle
        ? existingForCycle
        : await tx.documentReviewRequest.create({
            data: {
              userId: user.userId,
              cycleId: activeCycle.id,
              comment: trimmedComment,
            },
            select: { id: true, comment: true },
          });
      const isNewRequest = !existingForCycle;

      await tx.uploadedFile.updateMany({
        where: { id: { in: fileIds }, userId: user.userId },
        data: { requestId: targetRequest.id },
      });

      const createdFiles = await tx.documentReviewFile.createMany({
        data: filesWithTypes.map((file) => ({
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

      const updatedRequest = await recalculateDocumentReviewRequestStatus(tx, targetRequest.id);
      const email = currentUser?.email ?? 'пользователя';
      const commentChanged = !isNewRequest && !commentsEqual(targetRequest.comment, trimmedComment);
      const notification =
        isNewRequest
          ? `Новая заявка на проверку документов от ${email}`
          : createdFiles.count > 0
            ? `Пользователь ${email} добавил документы к заявке на проверку: ${formatFilesCount(createdFiles.count)}`
            : commentChanged
              ? `Пользователь ${email} обновил комментарий к заявке на проверку документов`
              : null;

      return { request: updatedRequest, notification };
    });

    if (notification) {
      await notifyDocumentReviewAdmins(notification, request.id);
    }

    return reply.code(200).send(request);
  }

  // 4) Legacy-путь без активного цикла: сохраняем старую защиту от второй активной заявки.
  const existingUnconfirmed = existingRequests.find((request) => {
    const status = resolveDocumentReviewRequestStatus(request);
    return status === 'UNCONFIRMED' || status === 'PARTIALLY_CONFIRMED';
  });

  if (existingUnconfirmed) {
    return reply.code(400).send({ error: 'У вас уже есть активная заявка' });
  }

  // 4) Если есть подтверждённая заявка — дополняем её и возвращаем в статус UNCONFIRMED
  if (existingConfirmed) {
    const { request: updatedReq, notification } = await prisma.$transaction(async (tx) => {
      await saveDocumentTypes(tx);

      // привязываем новые файлы к существующей заявке
      await tx.uploadedFile.updateMany({
        where: { id: { in: fileIds }, userId: user.userId },
        data: { requestId: existingConfirmed.id },
      });

      const createdFiles = await tx.documentReviewFile.createMany({
        data: filesWithTypes.map((file) => ({
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

      const request = await recalculateDocumentReviewRequestStatus(tx, existingConfirmed.id);
      const email = currentUser?.email ?? 'пользователя';
      const commentChanged = !commentsEqual(existingConfirmed.comment, trimmedComment);
      const notification =
        createdFiles.count > 0
          ? `Пользователь ${email} добавил документы к заявке на проверку: ${formatFilesCount(createdFiles.count)}`
          : commentChanged
            ? `Пользователь ${email} обновил комментарий к заявке на проверку документов`
            : null;

      return { request, notification };
    });

    if (notification) {
      await notifyDocumentReviewAdmins(notification, updatedReq.id);
    }

    return reply.code(200).send(updatedReq);
  }

  // 5) Иначе создаём НОВУЮ заявку (случай "первый раз" или после REJECTED)
  const reqNew = await prisma.$transaction(async (tx) => {
    await saveDocumentTypes(tx);

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
      data: filesWithTypes.map((file) => ({
        requestId: created.id,
        fileId: file.id,
        type: file.type,
      })),
      skipDuplicates: true,
    });

    return recalculateDocumentReviewRequestStatus(tx, created.id);
  });

  await notifyDocumentReviewAdmins(
    `Новая заявка на проверку документов от ${currentUser?.email ?? 'пользователя'}`,
    reqNew.id,
  );

  return reply.code(201).send(reqNew);
}
