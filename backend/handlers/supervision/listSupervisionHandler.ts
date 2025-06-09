import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function listSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;
  const { status } = req.query as { status?: RecordStatus };

  const records = await prisma.supervisionRecord.findMany({
    where: {
      userId,
      ...(status && {
        hours: {
          some: { status },
        },
      }),
    },
    include: {
      hours: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return reply.send({ records });
}
