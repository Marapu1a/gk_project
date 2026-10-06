import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getMyCooperationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const relations = await prisma.reviewerCandidateRelation.findMany({
    where: { candidateId: userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      endedAt: true,
      endedById: true,
      endReason: true,
      reviewer: { select: { id: true, fullName: true, email: true } },
      cycle: { select: { status: true, endedAt: true } },
    },
  });

  return reply.send({
    items: relations.map(({ cycle, ...relation }) => ({
      ...relation,
      status: cycle.status === 'ACTIVE' || relation.status === 'REJECTED' ? relation.status : 'ENDED',
      endedAt: relation.endedAt ?? (cycle.status === 'ACTIVE' || relation.status === 'REJECTED' ? null : cycle.endedAt),
      endedByLabel: relation.endReason === 'CERTIFICATE_ISSUED' ? 'Автоматически при выдаче сертификата'
        : relation.endedById === userId ? 'Вами'
        : relation.endedById === relation.reviewer.id ? 'Проверяющим'
        : null,
    })),
  });
}
