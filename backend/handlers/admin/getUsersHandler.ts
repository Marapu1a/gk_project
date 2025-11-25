// src/handlers/admin/getUsersHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

type Q = {
  role?: string;
  group?: string;
  search?: string;
  page?: string | number;
  perPage?: string | number;
};

function toInt(v: Q['page'], def: number) {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : def;
  return Number.isFinite(n) && n > 0 ? n : def;
}

function tokenize(q: string) {
  return q
    .toLowerCase()
    .normalize('NFKC')
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// маппинг “человеческих” ролей -> enum
function detectRole(tok: string): 'ADMIN' | 'REVIEWER' | 'STUDENT' | null {
  const t = tok.toLowerCase();
  if (/^(ад|адм|админ|админист|admin|adm)$/.test(t)) return 'ADMIN';
  if (/^(пров|провер|проверяющ|рев|ревью|review|reviewer)$/.test(t)) return 'REVIEWER';
  if (/^(соис|соиск|соиска|соискате)$/.test(t)) return 'STUDENT';
  return null;
}

export async function getUsersHandler(req: FastifyRequest, reply: FastifyReply) {
  const { role, group, search, page, perPage } = req.query as Q;
  const actorRole = (req as any).user?.role ?? (req as any).user?.role; // на всякий, если типы кривые

  if (!actorRole) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const take = Math.min(toInt(perPage, 50), 100);
  const pageNum = toInt(page, 1);
  const skip = (pageNum - 1) * take;

  let where: any = {};

  // 1) фильтр по роли
  if (actorRole === 'ADMIN') {
    if (role && ['ADMIN', 'REVIEWER', 'STUDENT'].includes(role)) {
      where.role = role;
    }
  } else {
    where.role = 'ADMIN';
  }

  // 2) фильтр по группе
  if (group && group.trim()) {
    where.groups = {
      some: { group: { name: { contains: group.trim(), mode: 'insensitive' } } },
    };
  }

  // 3) поиск (БЕЗ fullNameLatin — как просил)
  if (search && search.trim()) {
    const tokens = tokenize(search);
    const AND: any[] = [];

    for (const tok of tokens) {
      const r = detectRole(tok);
      const OR: any[] = [
        { fullName: { contains: tok, mode: 'insensitive' } },
        { email: { contains: tok, mode: 'insensitive' } },
        { groups: { some: { group: { name: { contains: tok, mode: 'insensitive' } } } } },
      ];
      if (actorRole === 'ADMIN' && r) OR.push({ role: r });
      AND.push({ OR });
    }

    where = Object.keys(where).length ? { AND: [where, { AND }] } : { AND };
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
        fullNameLatin: true,
        role: true,
        createdAt: true,
        avatarUrl: true, // 👈 добавили аватар
        groups: { select: { group: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  return reply.send({
    total,
    page: pageNum,
    perPage: take,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      fullNameLatin: u.fullNameLatin,
      role: u.role,
      createdAt: u.createdAt,
      avatarUrl: u.avatarUrl ?? null, // 👈 протащили в DTO
      groups: u.groups.map((g) => g.group),
    })),
  });
}
