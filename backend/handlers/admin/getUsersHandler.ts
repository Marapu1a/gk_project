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
  // проверяющий / ревьюер
  if (/^(пров|провер|проверяющ|рев|ревью|review|reviewer)$/.test(t)) return 'REVIEWER';
  // студент/соискатель
  if (/^(соис|соиск|студ|студент)$/.test(t)) return 'STUDENT';
  return null;
}

export async function getUsersHandler(req: FastifyRequest, reply: FastifyReply) {
  const { role, group, search, page, perPage } = req.query as Q;
  const actorRole = req.user?.role;

  if (!actorRole) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const take = Math.min(toInt(perPage, 50), 100);
  const pageNum = toInt(page, 1);
  const skip = (pageNum - 1) * take;

  let where: any = {};

  // 1) фильтр по роли
  if (actorRole === 'ADMIN') {
    // админ может явно фильтровать по любой роли
    if (role && ['ADMIN', 'REVIEWER', 'STUDENT'].includes(role)) {
      where.role = role;
    }
  } else {
    // не-админы всегда видят только админов (для подсказок и служебных форм)
    where.role = 'ADMIN';
  }

  // 2) фильтр по группе (?group=Супервизор) — подстрочный, регистронезависимый
  if (group && group.trim()) {
    where.groups = {
      some: { group: { name: { contains: group.trim(), mode: 'insensitive' } } },
    };
  }

  // 3) живой поиск: ФИО, email, названия групп + распознавание роли из текста
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
      // распознавание роли из текста имеет смысл только для админа (он видит все роли)
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
        role: true,
        createdAt: true,
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
      role: u.role,
      createdAt: u.createdAt,
      groups: u.groups.map((g) => g.group),
    })),
  });
}
