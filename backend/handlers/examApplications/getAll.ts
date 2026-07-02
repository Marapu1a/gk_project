import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { buildUserIdentitySearchWhere } from '../../utils/userIdentitySearch';

export async function getAllExamAppsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { role?: 'ADMIN' | 'REVIEWER' | 'STUDENT' } | undefined;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const { search } = req.query as { search?: string };
  const userSearchWhere = buildUserIdentitySearchWhere(search);

  const apps = await prisma.examApplication.findMany({
    where: {
      status: { not: 'NOT_SUBMITTED' },
      // не показываем заявки пользователей с ролью ADMIN
      user: {
        role: { not: 'ADMIN' },
        ...(userSearchWhere ?? {}),
      },
    },
    orderBy: { updatedAt: 'desc' },
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
      cycle: {
        select: {
          id: true,
          type: true,
          status: true,
          targetLevel: true,
          startedAt: true,
        },
      },
      user: {
        select: {
          email: true,
          fullName: true,
          fullNameLatin: true,
          phone: true,
          registrationNumber: true,
          role: true,
        },
      },
    },
  });

  return reply.send(apps);
}
