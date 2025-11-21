// src/handlers/admin/supervision/getUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getNextGroupName,
  getPrevGroupName,
  calcAutoSupervisionHours,
} from '../../../utils/supervisionRequirements';

/**
 * Категории выводим в новой модели:
 * PRACTICE (ранее INSTRUCTOR)
 * SUPERVISION (ранее CURATOR) — теперь только вычисляется из практики
 * SUPERVISOR (менторские)
 */
type Level = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';

const LEVELS: readonly Level[] = ['PRACTICE', 'SUPERVISION', 'SUPERVISOR'] as const;
// НЕ readonly-тип, иначе Prisma ругается на where.status.in
const STATUSES: RecordStatus[] = ['CONFIRMED', 'UNCONFIRMED'];

// enum-уровень цели -> русское имя группы, чьи требования показывать
const RU_BY_LEVEL: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

interface Route extends RouteGenericInterface {
  Params: { userId: string };
}

// Приводим старые значения к новой схеме
// ❗ SUPERVISION/CURATOR из БД теперь игнорируем — считаем их только авто.
function normalizeLevel(type: string): Level | null {
  if (type === 'INSTRUCTOR' || type === 'PRACTICE') return 'PRACTICE';
  if (type === 'SUPERVISOR') return 'SUPERVISOR';
  return null;
}

export async function getUserSupervisionMatrixAdminHandler(
  req: FastifyRequest<Route>,
  reply: FastifyReply,
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      targetLevel: true,
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = user.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0] || null;

  // Суммируем только CONFIRMED и UNCONFIRMED
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: { userId },
      status: { in: STATUSES },
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

    const sum = (g._sum?.value ?? 0) as number;
    matrix[lvl][st] = sum;
  }

  // ---- автосупервизия из практики по тем же правилам, что и в summary ----
  if (primaryGroup) {
    const targetFromUser = user.targetLevel ?? undefined;
    const targetGroupName =
      (targetFromUser && RU_BY_LEVEL[targetFromUser]) ||
      getNextGroupName(primaryGroup.name);

    if (targetGroupName) {
      const prevGroupName = getPrevGroupName(targetGroupName);
      const prevReq = prevGroupName ? supervisionRequirementsByGroup[prevGroupName] : null;
      const prevPracticeFloor = prevReq?.practice ?? 0;

      const practiceConfirmedRaw = matrix.PRACTICE.CONFIRMED;
      const practicePendingRaw = matrix.PRACTICE.UNCONFIRMED;

      const practiceConfirmedDelta = Math.max(0, practiceConfirmedRaw - prevPracticeFloor);
      const practicePendingDelta = practicePendingRaw;

      const autoConfirmed = calcAutoSupervisionHours({
        groupName: targetGroupName,
        practiceHours: practiceConfirmedDelta,
      });

      const autoTotalIfAll = calcAutoSupervisionHours({
        groupName: targetGroupName,
        practiceHours: practiceConfirmedDelta + practicePendingDelta,
      });

      const autoPending = Math.max(0, autoTotalIfAll - autoConfirmed);

      matrix.SUPERVISION.CONFIRMED = autoConfirmed;
      matrix.SUPERVISION.UNCONFIRMED = autoPending;
    }
  }

  // во внешнем ответе user без служебных полей
  return reply.send({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    matrix,
  });
}
