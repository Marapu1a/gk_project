import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { DocumentReviewFileStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { recalculateDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

import { UPLOAD_ROOT } from '../../config/storage';

type Body = {
  status?: DocumentReviewFileStatus;
  type?: string | null;
  adminComment?: string | null;
};

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_ROOT;

  const filePath = path.join(baseDir, fileId);

  try {
    await fs.unlink(filePath);
  } catch {
    // Файл мог уже отсутствовать. Для review-истории это не критично.
  }
}

export async function updateDocumentReviewFile(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id, fileReviewId } = req.params as { id: string; fileReviewId: string };
  const { status, type, adminComment } = (req.body || {}) as Body;

  if (status && !Object.values(DocumentReviewFileStatus).includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус документа' });
  }

  const trimmedComment = adminComment?.trim() || null;

  if (
    (status === DocumentReviewFileStatus.REJECTED || status === DocumentReviewFileStatus.DELETED) &&
    !trimmedComment
  ) {
    return reply.code(400).send({ error: 'Комментарий обязателен при отклонении или удалении' });
  }

  const reviewFile = await prisma.documentReviewFile.findFirst({
    where: { id: fileReviewId, requestId: id },
    include: { file: true },
  });

  if (!reviewFile) {
    return reply.code(404).send({ error: 'Документ заявки не найден' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (typeof type !== 'undefined') {
      await tx.uploadedFile.update({
        where: { id: reviewFile.fileId },
        data: { type },
      });
    }

    const data: any = {};

    if (typeof type !== 'undefined') data.type = type;
    if (typeof adminComment !== 'undefined') data.adminComment = trimmedComment;

    if (status) {
      data.status = status;
      data.reviewedAt = new Date();
      data.reviewedById = user.userId;

      if (status === DocumentReviewFileStatus.DELETED) {
        data.deletedAt = new Date();
        data.deletedById = user.userId;
      }
    }

    const file = await tx.documentReviewFile.update({
      where: { id: fileReviewId },
      data,
      include: {
        file: true,
        reviewedBy: { select: { id: true, email: true, fullName: true } },
        deletedBy: { select: { id: true, email: true, fullName: true } },
      },
    });

    await recalculateDocumentReviewRequestStatus(tx, id);

    return file;
  });

  if (status === DocumentReviewFileStatus.DELETED) {
    await deletePhysicalFile(reviewFile.file.fileId);
  }

  return reply.send(updated);
}
