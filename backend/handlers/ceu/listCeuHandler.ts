import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function listCeuHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = req.user;

  const records = await prisma.cEURecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      entries: true,
    },
  });

  return reply.send({ records });
}
