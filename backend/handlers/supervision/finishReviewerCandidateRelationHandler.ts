import { FastifyReply, FastifyRequest } from 'fastify';
import { ReviewerCandidateStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { finishCooperation } from '../../domain/supervision/finishCooperation';

export async function finishReviewerCandidateRelationHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const actorId = req.user?.userId;
  if (!actorId) return reply.code(401).send({ error: 'Не авторизован' });

  const relation = await prisma.reviewerCandidateRelation.findUnique({
    where: { id: req.params.id },
    select: { id: true, reviewerId: true, candidateId: true, cycleId: true, kind: true, status: true },
  });
  if (!relation) return reply.code(404).send({ error: 'Сотрудничество не найдено' });
  if (relation.reviewerId !== actorId && relation.candidateId !== actorId) {
    return reply.code(403).send({ error: 'Завершить сотрудничество может только его участник' });
  }
  if (relation.status !== ReviewerCandidateStatus.ACCEPTED) {
    return reply.code(409).send({ error: 'Завершить можно только действующее сотрудничество. Обновите страницу.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${relation.cycleId}))`;
    return finishCooperation(tx, relation, {
      endedById: actorId,
      reason: 'MANUAL',
      endedAt: new Date(),
    });
  });
  if (!result) return reply.code(409).send({ error: 'Сотрудничество уже завершено. Обновите страницу.' });
  return reply.send({ success: true, relationId: relation.id, status: ReviewerCandidateStatus.ENDED, ...result });
}
