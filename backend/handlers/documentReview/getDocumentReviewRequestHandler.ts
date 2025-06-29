import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getDocumentReviewRequestHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const user = req.user;

  if (!user) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const existingRequest = await prisma.documentReviewRequest.findFirst({
    where: {
      userId: user.userId,
      status: 'UNCONFIRMED',
    },
  });

  return reply.send(existingRequest || {});
}
