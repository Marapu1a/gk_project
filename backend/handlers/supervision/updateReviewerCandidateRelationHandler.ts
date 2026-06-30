import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { ReviewerCandidateStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

interface UpdateRelationRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: { status?: ReviewerCandidateStatus };
}

export async function updateReviewerCandidateRelationHandler(
  req: FastifyRequest<UpdateRelationRoute>,
  reply: FastifyReply,
) {
  const reviewerId = req.user?.userId;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const { id } = req.params;
  const { status } = req.body ?? {};

  if (
    status !== ReviewerCandidateStatus.ACCEPTED &&
    status !== ReviewerCandidateStatus.REJECTED
  ) {
    return reply.code(400).send({ error: 'Некорректный статус связи' });
  }

  const relation = await prisma.reviewerCandidateRelation.findUnique({
    where: { id },
    select: { id: true, reviewerId: true, status: true },
  });

  if (!relation) return reply.code(404).send({ error: 'Сотрудничество с кандидатом не найдено' });
  if (relation.reviewerId !== reviewerId) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }
  if (relation.status !== ReviewerCandidateStatus.PENDING) {
    return reply.code(400).send({ error: 'Сотрудничество уже обработано' });
  }

  const updated = await prisma.reviewerCandidateRelation.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      reviewerId: true,
      candidateId: true,
      cycleId: true,
      kind: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return reply.send({ success: true, relation: updated });
}
