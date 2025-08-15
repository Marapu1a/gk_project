// src/handlers/exam/getMyExamApp.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { getOrCreateExamApp } from './utils';

export async function getMyExamAppHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const app = await getOrCreateExamApp(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });

  return reply.send({
    id: app.id,
    userId: app.userId,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    user, // <- { email, fullName }
  });
}
