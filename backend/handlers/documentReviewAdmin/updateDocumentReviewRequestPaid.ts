import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateDocumentReviewRequestPaid(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };
  const { paid } = req.body as { paid: boolean };

  const updated = await prisma.documentReviewRequest.update({
    where: { id },
    data: {
      paid,
    },
  });

  return reply.send(updated);
}
