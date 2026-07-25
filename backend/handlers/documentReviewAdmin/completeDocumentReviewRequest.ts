import { DocumentReviewFileStatus, DocumentReviewState } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function completeDocumentReviewRequest(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const user = req.user as { userId?: string };
  const { id } = req.params as { id: string };

  const request = await prisma.documentReviewRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reviewState: true,
      documentFiles: { select: { status: true } },
    },
  });

  if (!request) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  if (request.reviewState === DocumentReviewState.COMPLETED) {
    return reply.send(request);
  }

  const reviewableFiles = request.documentFiles.filter(
    (file) => file.status !== DocumentReviewFileStatus.DELETED,
  );
  const hasPendingFiles = reviewableFiles.some(
    (file) => file.status === DocumentReviewFileStatus.UNCONFIRMED,
  );
  const hasConfirmedFiles = reviewableFiles.some(
    (file) => file.status === DocumentReviewFileStatus.CONFIRMED,
  );

  if (hasPendingFiles) {
    return reply.code(400).send({ error: 'Сначала обработайте все загруженные документы' });
  }

  if (!hasConfirmedFiles) {
    return reply.code(400).send({ error: 'Для завершения проверки нужен хотя бы один принятый документ' });
  }

  const completed = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      reviewState: DocumentReviewState.COMPLETED,
      reviewClosedAt: new Date(),
      reviewClosedById: user.userId ?? null,
    },
  });

  return reply.send(completed);
}
