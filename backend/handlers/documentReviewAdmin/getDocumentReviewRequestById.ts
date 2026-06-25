import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { withResolvedDocumentReviewRequestStatus } from './documentReviewFileStatusUtils';

export async function getDocumentReviewRequestById(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };

  const request = await prisma.documentReviewRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          groups: {
            select: {
              group: {
                select: { name: true, rank: true },
              },
            },
          },
          cycles: {
            where: { status: 'ACTIVE' },
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              type: true,
              targetLevel: true,
            },
          },
        },
      },
      cycle: { select: { id: true, type: true, status: true, targetLevel: true, startedAt: true } },
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
  });

  if (!request) {
    return reply.code(404).send({ error: 'Заявка не найдена' });
  }

  const relatedRequests = await prisma.documentReviewRequest.findMany({
    where: {
      userId: request.userId,
      id: { not: request.id },
    },
    orderBy: { submittedAt: 'desc' },
    take: 12,
    include: {
      cycle: { select: { id: true, type: true, status: true, targetLevel: true, startedAt: true } },
      documentFiles: { select: { id: true, status: true } },
      _count: { select: { documents: true, documentFiles: true } },
    },
  });

  return reply.send({
    ...withResolvedDocumentReviewRequestStatus(request),
    relatedRequests: relatedRequests.map(withResolvedDocumentReviewRequestStatus),
  });
}
