import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateDocumentReviewRequestPaid(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };
  const { paid } = req.body as { paid: boolean };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const updated = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      paid,
    },
  });

  return reply.send(updated);
}
