// src/handlers/admin/getUsersHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

type Q = {
  role?: string;
  group?: string;
  search?: string;
  page?: string | number;
  perPage?: string | number;
  // спец-режим для фильтра выборки рецензентов часов
  // 'practice'  — получатели часов практики
  // 'mentor'    — получатели менторских часов
  supervision?: string;
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
  const { role, group, search, page, perPage, supervision } = req.query as Q;
  const actorRole = (req as any).user?.role ?? (req as any).user?.role;

  if (!actorRole) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const take = Math.min(toInt(perPage, 50), 100);
  const pageNum = toInt(page, 1);
  const skip = (pageNum - 1) * take;

  let where: any = {};

  // 1) фильтр по роли — БЕЗ форсированного "только ADMIN" для не-админов.
  // Если явно передали role — применяем (и админ, и не-админ могут этим пользоваться),
  // иначе не ограничиваем по роли вообще.
  if (role && ['ADMIN', 'REVIEWER', 'STUDENT'].includes(role)) {
    where.role = role;
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
      // только админ может искать по тексту «админ/ревьюер/соискатель» и этим менять фильтр по роли
      if (actorRole === 'ADMIN' && r) OR.push({ role: r });
      AND.push({ OR });
    }

    where = Object.keys(where).length ? { AND: [where, { AND }] } : { AND };
  }

  // 4) спец-режим для выбора рецензентов часов
  //
  // Требования:
  // 1. Часы ПРАКТИКИ отправляем супервизорам, опытным супервизорам и админам
  // 2. МЕНТОРСКИЕ часы отправляем опытным супервизорам и админам
  //
  // => supervision=practice:
  //    (role = ADMIN) OR (group IN ["Супервизор", "Опытный Супервизор"])
  // => supervision=mentor:
  //    (role = ADMIN) OR (group = "Опытный Супервизор")
  if (supervision === 'practice' || supervision === 'mentor') {
    const OR: any[] = [{ role: 'ADMIN' }];

    if (supervision === 'practice') {
      OR.push({
        groups: {
          some: {
            group: {
              name: { in: ['Супервизор', 'Опытный Супервизор'] },
            },
          },
        },
      });
    } else {
      // mentor
      OR.push({
        groups: {
          some: {
            group: {
              name: 'Опытный Супервизор',
            },
          },
        },
      });
    }

    if (Object.keys(where).length) {
      where = { AND: [where, { OR }] };
    } else {
      where = { OR };
    }
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
        avatarUrl: true,
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
      avatarUrl: u.avatarUrl ?? null,
      groups: u.groups.map((g) => g.group),
    })),
  });
}
