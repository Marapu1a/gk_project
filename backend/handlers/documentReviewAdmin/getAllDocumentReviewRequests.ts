// /handlers/documentReviewAdmin/getAllDocumentReviewRequests.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { withResolvedDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

export async function getAllDocumentReviewRequests(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { email } = req.query as { email?: string };

  if (!user?.userId || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  const requests = await prisma.documentReviewRequest.findMany({
    where: email ? {
      user: {
        email: {
          contains: email,
          mode: 'insensitive',
        },
      },
    } : {},
    orderBy: { submittedAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      cycle: { select: { id: true, type: true, status: true, targetLevel: true, startedAt: true } },
      documents: true,
      documentFiles: { select: { id: true, status: true, deletionRequestedAt: true } },
    },
  });

  return reply.send(requests.map(withResolvedDocumentReviewRequestStatus));
}
