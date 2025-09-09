// handlers/notifications/createNotificationHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

const ALLOWED_TYPES = new Set([
  'CEU',
  'SUPERVISION',
  'MENTORSHIP',
  'DOCUMENT',
  'EXAM',
  'PAYMENT',
  'NEW_USER', // <-- добавили
] as const);

type AllowedType = typeof ALLOWED_TYPES extends Set<infer U> ? U : never;

export async function createNotificationHandler(req: FastifyRequest, reply: FastifyReply) {

  const body = req.body as {
    userId: string;
    type: AllowedType; // <-- теперь включает NEW_USER
    message: string;
    link?: string;
  };

  if (!body?.userId || !body?.type || !body?.message) {
    return reply.code(400).send({ error: 'Недостаточно данных' });
  }
  if (!ALLOWED_TYPES.has(body.type)) {
    return reply.code(400).send({ error: 'Недопустимый тип уведомления' });
  }

  await prisma.notification.create({
    data: {
      userId: body.userId,
      type: body.type as any,
      message: body.message,
      link: body.link || null,
    },
  });

  return reply.send({ ok: true });
}
