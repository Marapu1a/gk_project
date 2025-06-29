import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateDocumentReviewRequestStatusRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    comment?: string;
  };
}

export async function updateDocumentReviewRequestStatusHandler(
  req: FastifyRequest<UpdateDocumentReviewRequestStatusRoute>,
  reply: FastifyReply
) {
  const { id } = req.params;
  const { status, comment } = req.body;

  if (!['CONFIRMED', 'REJECTED'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const dataToUpdate: any = {
    status,
    reviewedAt: new Date(),
    reviewerEmail: req.user?.email ?? null,
  };

  if (comment !== undefined) {
    dataToUpdate.comment = comment;
  }

  const updated = await prisma.documentReviewRequest.update({
    where: { id },
    data: dataToUpdate,
  });

  return reply.send(updated);
}
