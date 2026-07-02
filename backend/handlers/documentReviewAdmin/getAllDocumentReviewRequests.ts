// /handlers/documentReviewAdmin/getAllDocumentReviewRequests.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { withResolvedDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';
import { buildUserIdentitySearchWhere } from '../../utils/userIdentitySearch';

export async function getAllDocumentReviewRequests(req: FastifyRequest, reply: FastifyReply) {
  const { search, email } = req.query as { search?: string; email?: string };
  const userSearchWhere = buildUserIdentitySearchWhere(search ?? email);

  const requests = await prisma.documentReviewRequest.findMany({
    where: userSearchWhere ? { user: userSearchWhere } : {},
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
