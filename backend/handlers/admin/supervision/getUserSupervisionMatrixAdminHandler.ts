// src/handlers/admin/supervision/getUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { RecordStatus } from '@prisma/client';

/**
 * Категории выводим в новой модели:
 * PRACTICE (ранее INSTRUCTOR)
 * SUPERVISION (ранее CURATOR)
 * SUPERVISOR (менторские)
 */
type Level = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';

const LEVELS: readonly Level[] = ['PRACTICE', 'SUPERVISION', 'SUPERVISOR'] as const;
// НЕ readonly-тип, иначе Prisma ругается на where.status.in
const STATUSES: RecordStatus[] = ['CONFIRMED', 'UNCONFIRMED'];

interface Route extends RouteGenericInterface {
  Params: { userId: string };
}

// Приводим старые значения к новой схеме
function normalizeLevel(type: string): Level | null {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  if (type === 'SUPERVISOR' || type === 'PRACTICE' || type === 'SUPERVISION') return type as Level;
  return null;
}

export async function getUserSupervisionMatrixAdminHandler(
  req: FastifyRequest<Route>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  // Суммируем только CONFIRMED и UNCONFIRMED
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: { userId },
      status: { in: STATUSES }, // << ожидает RecordStatus[]
    },
    _sum: { value: true },
  });

  // matrix[level][status] = сумма часов
  const matrix: Record<Level, Record<RecordStatus, number>> = LEVELS.reduce((acc, lvl) => {
    acc[lvl] = { CONFIRMED: 0, UNCONFIRMED: 0 } as Record<RecordStatus, number>;
    return acc;
  }, {} as Record<Level, Record<RecordStatus, number>>);

  for (const g of grouped) {
    const lvl = normalizeLevel(g.type);
    const st = g.status as RecordStatus;
    if (!lvl || (st !== 'CONFIRMED' && st !== 'UNCONFIRMED')) continue;

    // _sum может быть undefined, value может быть null — страхуемся
    const sum = (g._sum?.value ?? 0) as number;
    matrix[lvl][st] = sum;
  }

  return reply.send({ user, matrix });
}
