import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getAssignedHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;

  if (!reviewerId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const hours = await prisma.supervisionHour.findMany({
    where: {
      reviewerId,
      status: 'UNCONFIRMED',
    },
    select: {
      id: true,
      type: true,
      value: true,
      status: true,
      record: {
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      record: {
        createdAt: 'desc',
      },
    },
  });

  reply.send(hours);
}
