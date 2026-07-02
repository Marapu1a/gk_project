// src/handlers/admin/getUsersHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { buildUserIdentitySearchWhere } from '../../utils/userIdentitySearch';

type Q = {
  role?: string;
  group?: string;
  search?: string;
  registeredFrom?: string;
  registeredTo?: string;
  status?: 'ACTIVE' | 'ARCHIVE_REQUESTED' | 'ARCHIVED' | 'ALL';
  page?: string | number;
  perPage?: string | number;
  // спец-режим для фильтра выборки рецензентов часов
  // 'practice'  — получатели часов практики
  // 'mentor'    — получатели менторских часов
  supervision?: string;
  archived?: 'active' | 'only' | 'with';
};

function toInt(v: Q['page'], def: number) {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : def;
  return Number.isFinite(n) && n > 0 ? n : def;
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addAnd(where: any, condition: any) {
  if (!condition || Object.keys(condition).length === 0) return where;
  if (!where || Object.keys(where).length === 0) return condition;
  return { AND: [where, condition] };
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
  const {
    role,
    group,
    search,
    registeredFrom,
    registeredTo,
    status,
    page,
    perPage,
    supervision,
    archived = 'active',
  } = req.query as Q;
  const actorRole = req.user?.role;

  if (!actorRole) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  if (actorRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const take = Math.min(toInt(perPage, 50), 10000);
  const pageNum = toInt(page, 1);
  const skip = (pageNum - 1) * take;

  let where: any = {};

  if (status === 'ARCHIVED') {
    where.archivedAt = { not: null };
  } else if (status === 'ARCHIVE_REQUESTED') {
    where.archivedAt = null;
    where.archiveRequestedAt = { not: null };
  } else if (status === 'ACTIVE') {
    where.archivedAt = null;
  } else if (!status || status !== 'ALL') {
    if (archived === 'only') {
      where.archivedAt = { not: null };
    } else if (archived !== 'with') {
      where.archivedAt = null;
    }
  }

  const createdAt: Record<string, Date> = {};
  const fromDate = parseDateBoundary(registeredFrom);
  const toDate = parseDateBoundary(registeredTo, true);
  if (fromDate) createdAt.gte = fromDate;
  if (toDate) createdAt.lte = toDate;
  if (Object.keys(createdAt).length) {
    where = addAnd(where, { createdAt });
  }

  if (status === 'ACTIVE') {
    where.archivedAt = null;
  }

  // 1) фильтр по роли: применяем только если админ явно передал role.
  if (role && ['ADMIN', 'REVIEWER', 'STUDENT'].includes(role)) {
    where.role = role;
  }

  // 2) фильтр по группе
  if (group && group.trim()) {
    where = addAnd(where, {
      groups: {
      some: { group: { name: { contains: group.trim(), mode: 'insensitive' } } },
      },
    });
  }

  // 3) поиск по данным пользователя
  if (search && search.trim()) {
    const searchWhere = buildUserIdentitySearchWhere(search, {
      extraTokenConditions: (tok) => {
        const OR: any[] = [
          { groups: { some: { group: { name: { contains: tok, mode: 'insensitive' } } } } },
        ];
        const r = detectRole(tok);
        if (actorRole === 'ADMIN' && r) OR.push({ role: r });
        return OR;
      },
    });

    if (searchWhere) {
      where = addAnd(where, searchWhere);
    }
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
      where = addAnd(where, { OR });
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
        registrationNumber: true,
        phone: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
        archivedAt: true,
        archiveRequestedAt: true,
        archiveRequestReason: true,
        avatarUrl: true,
        groups: { select: { group: { select: { id: true, name: true, rank: true } } } },
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
      registrationNumber: u.registrationNumber,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
      archivedAt: u.archivedAt,
      archiveRequestedAt: u.archiveRequestedAt,
      archiveRequestReason: u.archiveRequestReason,
      avatarUrl: u.avatarUrl ?? null,
      groups: u.groups.map((g) => g.group),
    })),
  });
}
