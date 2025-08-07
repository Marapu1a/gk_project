import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, CEUCategory } from '@prisma/client';

export async function updateCEUEntryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { category, value, status, rejectedReason } = req.body as {
    category?: CEUCategory;
    value?: number;
    status?: RecordStatus;
    rejectedReason?: string;
  };

  const updated = await prisma.cEUEntry.update({
    where: { id },
    data: {
      ...(category && { category }),
      ...(value !== undefined && { value }),
      ...(status && {
        status,
        reviewedAt: new Date(),
        reviewerId: req.user?.userId ?? null,
        rejectedReason: status === 'REJECTED' ? rejectedReason ?? null : null,
      }),
    },
  });

  return reply.send(updated);
}
