import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface UpdateCommentRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    comment: string;
  };
}

export async function updateDocumentReviewRequestCommentHandler(
  req: FastifyRequest<UpdateCommentRoute>,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { id } = req.params;
  const { comment } = req.body;

  const existingRequest = await prisma.documentReviewRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  const updatedRequest = await prisma.documentReviewRequest.update({
    where: { id },
    data: { comment },
  });

  return reply.send(updatedRequest);
}
