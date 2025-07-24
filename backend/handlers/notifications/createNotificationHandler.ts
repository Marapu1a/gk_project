import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function createNotificationHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as {
    userId: string;
    type: 'CEU' | 'SUPERVISION' | 'MENTORSHIP' | 'DOCUMENT';
    message: string;
    link?: string;
  };

  if (!body.userId || !body.type || !body.message) {
    return reply.code(400).send({ error: 'Недостаточно данных' });
  }

  await prisma.notification.create({
    data: {
      userId: body.userId,
      type: body.type,
      message: body.message,
      link: body.link || null,
    },
  });

  return reply.send({ ok: true });
}
