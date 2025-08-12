// handlers/registry/profile.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { getRegistryProfile } from './utils';

type Params = { userId: string };

export async function getRegistryProfileHandler(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  const { userId } = req.params;
  const data = await getRegistryProfile(userId);
  if (!data) return reply.code(404).send({ error: 'Профиль не найден' });

  const cache = process.env.NODE_ENV === 'production'
    ? 'public, max-age=60, must-revalidate'
    : 'no-store';

  reply.header('Cache-Control', cache);
  return reply.send(data);
}
