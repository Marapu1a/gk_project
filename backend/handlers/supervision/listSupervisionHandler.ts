import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus } from '@prisma/client';

type Query = {
  userId?: string;        // чьи записи смотреть (только ADMIN/REVIEWER)
  status?: RecordStatus;  // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;          // кол-во записей
  cursor?: string;        // id записи для пагинации
};

// Локальная нормализация типов для совместимости UI:
// INSTRUCTOR → PRACTICE, CURATOR → SUPERVISION, остальное как есть.
function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type;
}

export async function listSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const actorId = req.user?.userId;
  const actorRole = req.user?.role;
  if (!actorId) return reply.code(401).send({ error: 'Не авторизован' });

  const { userId: qUserId, status, take = '20', cursor } = req.query as Query;

  // Кого смотрим: ADMIN/REVIEWER могут указать чужого, иначе только свои
  const targetUserId =
    (actorRole === 'ADMIN' || actorRole === 'REVIEWER') && qUserId ? qUserId : actorId;

  // Валидации
  if (status && !['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }
  const limit = Math.max(1, Math.min(100, Number.isFinite(+take) ? +take : 20));

  // Фильтр по статусу влияет и на hours внутри include
  const recordWhere: any = { userId: targetUserId };
  if (status) recordWhere.hours = { some: { status } };

  const recordsRaw = await prisma.supervisionRecord.findMany({
    where: recordWhere,
    include: {
      hours: {
        ...(status ? { where: { status } } : {}),
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }], // стабильность сортировки
      },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  });

  // Нормализуем типы часов в ответе, БД не трогаем
  const records = recordsRaw.map((r) => ({
    ...r,
    hours: r.hours.map((h) => ({
      ...h,
      type: normalizeLevel(h.type),
    })),
  }));

  const nextCursor = recordsRaw.length === limit ? recordsRaw[recordsRaw.length - 1].id : null;

  return reply.send({ records, nextCursor });
}
