import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { DocumentReviewFileStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { recalculateDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

const UPLOAD_DIR = process.env.UPLOAD_DIR;

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  try {
    await fs.unlink(path.join(baseDir, fileId));
  } catch {
    // Файл мог быть удален первым шагом. Финальную зачистку это не блокирует.
  }
}

export async function deleteDocumentReviewFile(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id, fileReviewId } = req.params as { id: string; fileReviewId: string };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const reviewFile = await prisma.documentReviewFile.findFirst({
    where: { id: fileReviewId, requestId: id },
    include: { file: true },
  });

  if (!reviewFile) {
    return reply.code(404).send({ error: 'Документ заявки не найден' });
  }

  if (reviewFile.status !== DocumentReviewFileStatus.DELETED) {
    return reply.code(400).send({ error: 'Насовсем можно удалить только уже удаленный документ' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentReviewFile.delete({ where: { id: fileReviewId } });

    await tx.uploadedFile.delete({
      where: { id: reviewFile.fileId },
    });

    await recalculateDocumentReviewRequestStatus(tx, id);
  });

  await deletePhysicalFile(reviewFile.file.fileId);

  return reply.send({ ok: true });
}
