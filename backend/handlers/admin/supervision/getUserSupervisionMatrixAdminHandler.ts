// src/handlers/admin/supervision/getUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';

type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
type Status = 'CONFIRMED' | 'UNCONFIRMED';

const LEVELS: readonly Level[] = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
const STATUSES: readonly Status[] = ['CONFIRMED', 'UNCONFIRMED'] as const;

interface Route extends RouteGenericInterface {
  Params: { userId: string };
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
      status: { in: ['CONFIRMED', 'UNCONFIRMED'] },
    },
    _sum: { value: true },
  });

  // matrix[level][status]
  const matrix: Record<Level, Record<Status, number>> = LEVELS.reduce((acc, lvl) => {
    acc[lvl] = { CONFIRMED: 0, UNCONFIRMED: 0 };
    return acc;
  }, {} as Record<Level, Record<Status, number>>);

  for (const g of grouped) {
    const lvl = g.type as Level;
    const st = g.status as Status;
    if (LEVELS.includes(lvl) && STATUSES.includes(st)) {
      matrix[lvl][st] = (g._sum.value ?? 0) as number;
    }
  }

  return reply.send({ user, matrix });
}
