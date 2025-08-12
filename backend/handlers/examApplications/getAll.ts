import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getAllExamAppsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as { role?: 'ADMIN' | 'REVIEWER' | 'STUDENT' } | undefined;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const apps = await prisma.examApplication.findMany({
    where: {
      // не показываем заявки пользователей с ролью ADMIN
      user: { role: { not: 'ADMIN' } },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { email: true, fullName: true, role: true } },
    },
  });

  return reply.send(apps);
}
