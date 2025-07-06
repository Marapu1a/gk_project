import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateDocumentReviewRequestStatus(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };
  const { status, comment } = req.body as { status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED'; comment?: string };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  if (!['UNCONFIRMED', 'CONFIRMED', 'REJECTED'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  if (status === 'REJECTED' && !comment) {
    return reply.code(400).send({ error: 'Комментарий обязателен при отклонении' });
  }

  const updated = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      status,
      comment: status === 'REJECTED' ? comment : null,
      reviewerEmail: user.email,
      reviewedAt: new Date(),
    },
  });

  return reply.send(updated);
}
