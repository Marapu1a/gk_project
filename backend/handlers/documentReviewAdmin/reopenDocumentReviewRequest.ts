import { DocumentReviewState } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function reopenDocumentReviewRequest(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };

  const request = await prisma.documentReviewRequest.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!request) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  const reopened = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      reviewState: DocumentReviewState.OPEN,
      reviewClosedAt: null,
      reviewClosedById: null,
    },
  });

  return reply.send(reopened);
}
