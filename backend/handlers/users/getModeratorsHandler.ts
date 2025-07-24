import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getModeratorsHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewers = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'REVIEWER'] },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  return reply.send(reviewers);
}
