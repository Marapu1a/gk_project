import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { DocumentReviewFileStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { recalculateDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

import { UPLOAD_ROOT } from '../../config/storage';

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_ROOT;

  try {
    await fs.unlink(path.join(baseDir, fileId));
  } catch {
    // Файл мог быть удален первым шагом. Финальную зачистку это не блокирует.
  }
}

export async function deleteDocumentReviewFile(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id, fileReviewId } = req.params as { id: string; fileReviewId: string };

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

  const physicalFileIdToDelete = await prisma.$transaction(async (tx) => {
    await tx.documentReviewFile.delete({ where: { id: fileReviewId } });

    const uploadedFile = await tx.uploadedFile.findUnique({
      where: { id: reviewFile.fileId },
      select: {
        fileId: true,
        requestId: true,
        certificate: { select: { id: true } },
        supervisionContract: { select: { id: true } },
        _count: { select: { documentReviewFiles: true } },
      },
    });

    const fileStillBelongsToAnotherRequest =
      uploadedFile?.requestId && uploadedFile.requestId !== id;

    const canDeleteUploadedFile =
      uploadedFile &&
      uploadedFile._count.documentReviewFiles === 0 &&
      !fileStillBelongsToAnotherRequest &&
      !uploadedFile.certificate &&
      !uploadedFile.supervisionContract;

    let physicalFileId: string | null = null;

    if (canDeleteUploadedFile) {
      physicalFileId = uploadedFile.fileId;

      await tx.uploadedFile.delete({
        where: { id: reviewFile.fileId },
      });
    }

    await recalculateDocumentReviewRequestStatus(tx, id);

    return physicalFileId;
  });

  if (physicalFileIdToDelete) {
    await deletePhysicalFile(physicalFileIdToDelete);
  }

  return reply.send({ ok: true });
}
