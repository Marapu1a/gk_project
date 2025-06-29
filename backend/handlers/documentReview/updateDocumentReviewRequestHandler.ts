import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateDocumentReviewRequestRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    status: 'CONFIRMED' | 'REJECTED';
    comment?: string;
  };
}

export async function updateDocumentReviewRequestHandler(
  req: FastifyRequest<UpdateDocumentReviewRequestRoute>,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'REVIEWER')) {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { id } = req.params;

  const existingRequest = await prisma.documentReviewRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  const updatedRequest = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      status: req.body.status,
      comment: req.body.comment || null,
      reviewerEmail: user.email,
      reviewedAt: new Date(),
    },
  });

  return reply.send(updatedRequest);
}
