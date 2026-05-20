import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { buildExamReadiness } from './readiness';

export async function getExamAppDetailsHandler(req: FastifyRequest, reply: FastifyReply) {
  const currentUser = req.user;
  const { userId } = req.params as { userId: string };
  const { applicationId } = (req.query ?? {}) as { applicationId?: string };

  if (!currentUser?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  if (currentUser.role !== 'ADMIN' && currentUser.userId !== userId) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const readiness = await buildExamReadiness(userId);
  if (!readiness) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const application = await prisma.examApplication.findFirst({
    where: applicationId
      ? { id: applicationId, userId }
      : {
          userId,
          cycleId: readiness.activeCycle?.id ?? null,
        },
    select: {
      id: true,
      userId: true,
      cycleId: true,
      status: true,
      comment: true,
      submittedAt: true,
      reviewedAt: true,
      reviewedByEmail: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return reply.send({
    application,
    readiness,
  });
}
