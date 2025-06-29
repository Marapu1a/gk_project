import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface CreateDocumentReviewRequestRoute extends RouteGenericInterface {
  Body: {
    documentDetails: {
      fileId: string;
      type: string;
      comment?: string;
    }[];
  };
}

export async function createDocumentReviewRequestHandler(
  req: FastifyRequest<CreateDocumentReviewRequestRoute>,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  // Проверяем существующую активную заявку
  const existingRequest = await prisma.documentReviewRequest.findFirst({
    where: {
      userId: user.userId,
      status: 'UNCONFIRMED',
    },
  });

  if (existingRequest) {
    return reply.code(400).send({ error: 'У вас уже есть активная заявка на проверку документов.' });
  }

  // Создаём новую заявку
  const newRequest = await prisma.documentReviewRequest.create({
    data: {
      userId: user.userId,
      documentDetails: req.body.documentDetails,
      paid: false,
      reviewerEmail: null,
      status: 'UNCONFIRMED',
    },
  });

  return reply.send(newRequest);
}
