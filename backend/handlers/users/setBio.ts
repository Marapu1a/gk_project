// src/handlers/users/setBio.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

export interface SetUserBioRoute extends RouteGenericInterface {
  Params: { userId: string };
  Body: { bio?: string | null };
}

export async function setUserBioHandler(
  req: FastifyRequest<SetUserBioRoute>,
  reply: FastifyReply
) {
  const { userId } = req.params;
  const raw = (req.body?.bio ?? '').toString().trim();

  // 🔧 важное исправление: в токене userId, а не id
  const actor = req.user as any;
  if (!actor || (actor.userId !== userId && actor.role !== 'ADMIN')) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  if (raw.length > 500) {
    return reply.code(400).send({ error: 'Максимум 500 символов' });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { bio: raw.length ? raw : null },
    select: { id: true, bio: true },
  });

  reply
    .header(
      'Cache-Control',
      process.env.NODE_ENV === 'production'
        ? 'public, max-age=60, must-revalidate'
        : 'no-store'
    )
    .send(user);
}
