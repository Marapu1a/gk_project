import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface SetAvatarUrlRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: { avatarUrl: string | null };
  Reply: { id: string; avatarUrl: string | null };
}

export async function setAvatarUrlHandler(
  req: FastifyRequest<SetAvatarUrlRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user; // как в твоём примере
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { id } = req.params;
  const { avatarUrl } = req.body || {};

  if (actor.role !== 'ADMIN' && actor.userId !== id) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (avatarUrl !== null && typeof avatarUrl !== 'string') {
    return reply.code(400).send({ error: 'avatarUrl должен быть строкой или null' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true },
  });

  return reply.send(updated);
}
