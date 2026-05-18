import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getDocReviewReq(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const request = await prisma.documentReviewRequest.findFirst({
    where: { userId: user.userId },
    include: {
      documents: true,
      documentFiles: {
        include: {
          file: true,
          reviewedBy: { select: { id: true, email: true, fullName: true } },
          deletedBy: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  return reply.send(request);
}
