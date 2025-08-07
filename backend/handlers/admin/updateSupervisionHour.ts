import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, PracticeLevel } from '@prisma/client';

export async function updateSupervisionHourHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { type, value, status, rejectedReason } = req.body as {
    type?: PracticeLevel;
    value?: number;
    status?: RecordStatus;
    rejectedReason?: string;
  };

  const updated = await prisma.supervisionHour.update({
    where: { id },
    data: {
      ...(type && { type }),
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
