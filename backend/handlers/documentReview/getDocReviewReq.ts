import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { withResolvedDocumentReviewRequestStatus } from '../documentReviewAdmin/documentReviewFileStatusUtils';
import { ensureRenewalDocumentInheritance } from './ensureRenewalDocumentInheritance';

export async function getDocReviewReq(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { id: true, type: true },
  });

  if (activeCycle) {
    await prisma.$transaction((tx) =>
      ensureRenewalDocumentInheritance(tx, user.userId, activeCycle),
    );
  }

  const requests = await prisma.documentReviewRequest.findMany({
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
    take: 10,
  });

  const request =
    (activeCycle
      ? requests.find((item) => item.cycleId === activeCycle.id)
      : null) ??
    requests.find((item) => !item.cycleId) ??
    requests[0] ??
    null;

  return reply.send(request ? withResolvedDocumentReviewRequestStatus(request) : null);
}
