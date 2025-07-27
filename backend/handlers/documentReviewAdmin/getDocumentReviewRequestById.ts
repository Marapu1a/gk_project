import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getDocumentReviewRequestById(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const request = await prisma.documentReviewRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      documents: true,
    },
  });

  if (!request) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  return reply.send(request);
}
