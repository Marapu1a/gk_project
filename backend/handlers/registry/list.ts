// handlers/registry/list.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { getRegistryList } from './utils';

type Query = {
  country?: string;
  city?: string;
  page?: string | number;
  limit?: string | number;
};

export async function listRegistryHandler(
  req: FastifyRequest<{ Querystring: Query }>,
  reply: FastifyReply
) {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20));
  const country = q.country?.trim() || undefined;
  const city = q.city?.trim() || undefined;

  const data = await getRegistryList({ country, city, page, limit });

  const cache = process.env.NODE_ENV === 'production'
    ? 'public, max-age=60, must-revalidate'
    : 'no-store';

  reply.header('Cache-Control', cache);
  return reply.send(data);
}
