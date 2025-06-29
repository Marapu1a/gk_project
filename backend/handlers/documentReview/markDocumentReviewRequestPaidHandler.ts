import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface MarkPaidRoute extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    paid: boolean;
  };
}

export async function markDocumentReviewRequestPaidHandler(
  req: FastifyRequest<MarkPaidRoute>,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { id } = req.params;
  const { paid } = req.body;

  if (typeof paid !== 'boolean') {
    return reply.code(400).send({ error: 'Поле paid обязательно и должно быть boolean' });
  }

  const existingRequest = await prisma.documentReviewRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  const updatedRequest = await prisma.documentReviewRequest.update({
    where: { id },
    data: { paid },
  });

  return reply.send(updatedRequest);
}
