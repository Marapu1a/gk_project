// src/handlers/admin/searchUsersHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

interface SearchUsersRoute extends RouteGenericInterface {
  Querystring: { q?: string; limit?: string };
}

export async function searchUsersHandler(
  req: FastifyRequest<SearchUsersRoute>,
  reply: FastifyReply
) {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'REVIEWER') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const q = (req.query.q ?? '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '8', 10) || 8, 1), 20);

  if (q.length < 2) return reply.send([]); // не шумим

  const tokens = q.split(/\s+/).filter(Boolean);

  const digits = q.replace(/\D/g, '');
  const searchOr: Prisma.UserWhereInput[] = [
    { email: { contains: q, mode: 'insensitive' } },
    { fullName: { contains: q, mode: 'insensitive' } },
    { fullNameLatin: { contains: q, mode: 'insensitive' } },
    { AND: tokens.map((t) => ({ fullName: { contains: t, mode: 'insensitive' } })) },
    { AND: tokens.map((t) => ({ fullNameLatin: { contains: t, mode: 'insensitive' } })) },
  ];

  if (digits) {
    searchOr.push(
      { phone: { contains: digits, mode: 'insensitive' } },
      { registrationNumber: { contains: digits, mode: 'insensitive' } },
    );
  }

  const users = await prisma.user.findMany({
    where: {
      archivedAt: null,
      OR: searchOr,
    },
    orderBy: { fullName: 'asc' },
    take: limit,
    select: {
      id: true,
      fullName: true,
      fullNameLatin: true,
      email: true,
      phone: true,
      registrationNumber: true,
      groups: { include: { group: { select: { name: true, rank: true } } } },
    },
  });

  const items = users.map((u) => {
    const top = u.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank)[0];
    return {
      id: u.id,
      fullName: u.fullName,
      fullNameLatin: u.fullNameLatin,
      email: u.email,
      phone: u.phone,
      registrationNumber: u.registrationNumber,
      groupName: top?.name ?? null,
    };
  });

  return reply.send(items);
}
