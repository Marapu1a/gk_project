import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentReviewFileStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { recalculateDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

export async function transferDocumentReviewFileToActiveCycle(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const user = req.user as any;
  const { id, fileReviewId } = req.params as { id: string; fileReviewId: string };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const sourceRequest = await prisma.documentReviewRequest.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      documentFiles: {
        where: { id: fileReviewId },
        select: { id: true, fileId: true, type: true, status: true },
      },
    },
  });

  if (!sourceRequest) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  let fileId: string | null = sourceRequest.documentFiles[0]?.fileId ?? null;
  let type: string | null = sourceRequest.documentFiles[0]?.type ?? null;
  const sourceStatus = sourceRequest.documentFiles[0]?.status ?? null;

  if (fileReviewId.startsWith('legacy-')) {
    const uploadedFileId = fileReviewId.replace(/^legacy-/, '');
    const legacyFile = await prisma.uploadedFile.findFirst({
      where: { id: uploadedFileId, requestId: sourceRequest.id, userId: sourceRequest.userId },
      select: { id: true, type: true },
    });

    fileId = legacyFile?.id ?? null;
    type = legacyFile?.type ?? null;
  }

  if (!fileId) {
    return reply.code(404).send({ error: 'Документ заявки не найден' });
  }

  if (sourceStatus === DocumentReviewFileStatus.DELETED) {
    return reply.code(400).send({ error: 'Удаленный документ нельзя перенести в текущий цикл' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: sourceRequest.userId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });

  if (!activeCycle) {
    return reply.code(400).send({ error: 'У пользователя нет активного цикла' });
  }

  if (sourceRequest.id) {
    const sourceIsActiveCycle = await prisma.documentReviewRequest.findFirst({
      where: { id: sourceRequest.id, cycleId: activeCycle.id },
      select: { id: true },
    });

    if (sourceIsActiveCycle) {
      return reply.code(400).send({ error: 'Документ уже относится к текущему циклу' });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const targetRequest =
      (await tx.documentReviewRequest.findFirst({
        where: { userId: sourceRequest.userId, cycleId: activeCycle.id },
        orderBy: { submittedAt: 'desc' },
        select: { id: true },
      })) ??
      (await tx.documentReviewRequest.create({
        data: {
          userId: sourceRequest.userId,
          cycleId: activeCycle.id,
        },
        select: { id: true },
      }));

    const existing = await tx.documentReviewFile.findFirst({
      where: {
        requestId: targetRequest.id,
        fileId,
        status: { not: DocumentReviewFileStatus.DELETED },
      },
      select: { id: true },
    });

    if (existing) {
      return {
        ok: true,
        alreadyExists: true,
        targetRequestId: targetRequest.id,
        fileReviewId: existing.id,
      };
    }

    const created = await tx.documentReviewFile.create({
      data: {
        requestId: targetRequest.id,
        fileId,
        type,
        status: DocumentReviewFileStatus.UNCONFIRMED,
      },
      select: { id: true },
    });

    await recalculateDocumentReviewRequestStatus(tx, targetRequest.id);

    return {
      ok: true,
      alreadyExists: false,
      targetRequestId: targetRequest.id,
      fileReviewId: created.id,
    };
  });

  return reply.send(result);
}
