import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type Query = {
  search?: string;
  supervision?: 'practice' | 'mentor';
  limit?: string | number;
};

function tokenize(q: string) {
  return q
    .toLowerCase()
    .normalize('NFKC')
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getReviewerSuggestionsHandler(req: FastifyRequest, reply: FastifyReply) {
  const actor = req.user;
  if (!actor?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const { search = '', supervision = 'practice', limit = 20 } = req.query as Query;
  if (supervision !== 'practice' && supervision !== 'mentor') {
    return reply.code(400).send({ error: 'Недопустимый тип подбора' });
  }

  const q = search.trim();
  if (q.length < 2) {
    return reply.send({ users: [] });
  }

  const take = Math.min(Math.max(Number(limit) || 20, 1), 20);
  const tokens = tokenize(q);

  const eligibleByRoleOrGroup =
    supervision === 'mentor'
      ? {
          OR: [
            { role: 'ADMIN' as const },
            { groups: { some: { group: { name: 'Опытный Супервизор' } } } },
          ],
        }
      : {
          OR: [
            { role: 'ADMIN' as const },
            {
              groups: {
                some: {
                  group: {
                    name: { in: ['Супервизор', 'Опытный Супервизор'] },
                  },
                },
              },
            },
          ],
        };

  const users = await prisma.user.findMany({
    where: {
      AND: [
        eligibleByRoleOrGroup,
        {
          AND: tokens.map((tok) => ({
            OR: [
              { fullName: { contains: tok, mode: 'insensitive' as const } },
              { email: { contains: tok, mode: 'insensitive' as const } },
              {
                groups: {
                  some: {
                    group: { name: { contains: tok, mode: 'insensitive' as const } },
                  },
                },
              },
            ],
          })),
        },
      ],
    },
    orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
    take,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      groups: {
        select: {
          group: { select: { id: true, name: true } },
        },
      },
    },
  });

  return reply.send({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      groups: u.groups.map((g) => g.group),
    })),
  });
}
