import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function updatePaymentHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { status, comment } = req.body as {
    status?: PaymentStatus;
    comment?: string;
  };

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      ...(status && {
        status,
        confirmedAt: status === 'PAID' ? new Date() : null,
      }),
      ...(comment !== undefined && { comment }),
    },
  });

  return reply.send(updated);
}
