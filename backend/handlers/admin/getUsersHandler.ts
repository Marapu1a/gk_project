import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUsersHandler(req: FastifyRequest, reply: FastifyReply) {
  const { role, group, search, page = 1, perPage = 50 } = req.query as {
    role?: string;
    group?: string;
    search?: string;
    page?: string | number;
    perPage?: string | number;
  };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const take = Math.min(Number(perPage), 100);
  const skip = (Number(page) - 1) * take;

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (group) {
    where.groups = {
      some: {
        group: { name: group },
      },
    };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        groups: {
          select: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return reply.send({
    total,
    page: Number(page),
    perPage: take,
    users: users.map(u => ({
      ...u,
      groups: u.groups.map(g => g.group),
    })),
  });
}
