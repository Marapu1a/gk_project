// src/handlers/admin/supervision/getUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { PracticeLevel, RecordStatus, CycleStatus, TargetLevel } from '@prisma/client';
import { supervisionRequirementsByGroup, calcAutoSupervisionHours } from '../../../utils/supervisionRequirements';
import { getCycleSupervisionTotals } from '../../../utils/getCycleSupervisionTotals';

type Level = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
const STATUSES: RecordStatus[] = ['CONFIRMED', 'UNCONFIRMED'];

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

type RequirementsGroupKey = keyof typeof supervisionRequirementsByGroup;

interface Route extends RouteGenericInterface {
  Params: { userId: string };
}

type SupervisionSummary = { practice: number; supervision: number; supervisor: number };

export async function getUserSupervisionMatrixAdminHandler(req: FastifyRequest<Route>, reply: FastifyReply) {
  if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: 'Только администратор' });

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groups = user.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const current = groups[0]?.name ?? null;

  // ACTIVE cycle обязателен: в эпоху циклов админ смотрит матрицу только внутри цикла
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true },
  });
  if (!activeCycle) return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });

  // ===== matrix aggregation (ТОЛЬКО ACTIVE cycle) =====
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: {
      record: { userId, cycleId: activeCycle.id },
      status: { in: STATUSES },
    },
    _sum: { value: true },
  });

  const matrix = matrixEmpty();
  for (const g of grouped) {
    const lvl = normalize(g.type);
    if (!lvl) continue;
    matrix[lvl][g.status as RecordStatus] = g._sum.value ?? 0;
  }

  // ===== target строго из цикла =====
  const targetRu: RequirementsGroupKey | null = RU_BY_LEVEL[activeCycle.targetLevel] ?? null;
  const required = targetRu ? supervisionRequirementsByGroup[targetRu] ?? null : null;

  const usableRaw: SupervisionSummary = {
    practice: matrix.PRACTICE.CONFIRMED,
    supervision: 0,
    supervisor: matrix.SUPERVISOR.CONFIRMED,
  };
  const pendingRaw: SupervisionSummary = {
    practice: matrix.PRACTICE.UNCONFIRMED,
    supervision: 0,
    supervisor: matrix.SUPERVISOR.UNCONFIRMED,
  };

  const isBasicSupervisor = current === 'Супервизор';

  // если по каким-то причинам required нет — отдаём только статистику
  if (!current || !targetRu || !required) {
    return reply.send({
      user: short(user),
      cycle: { id: activeCycle.id, targetLevel: activeCycle.targetLevel, status: CycleStatus.ACTIVE },
      matrix,
      summary: {
        required: null,
        percent: null,
        usable: usableRaw,
        pending: pendingRaw,
        mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null,
      },
    });
  }

  let bonusPractice = 0;
  let bonusSourceCycleId: string | null = null;

  if (activeCycle.targetLevel === TargetLevel.SUPERVISOR) {
    const lastCompletedCurator = await prisma.certificationCycle.findFirst({
      where: {
        userId,
        status: CycleStatus.COMPLETED,
        targetLevel: TargetLevel.CURATOR,
      },
      orderBy: { endedAt: 'desc' },
      select: { id: true },
    });

    if (lastCompletedCurator) {
      const bonusAgg = await prisma.supervisionHour.aggregate({
        where: {
          status: 'CONFIRMED',
          type: {
            in: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING, PracticeLevel.PROGRAMMING],
          },
          record: { cycleId: lastCompletedCurator.id },
        },
        _sum: { value: true },
      });

      bonusPractice = bonusAgg._sum.value ?? 0;
      bonusSourceCycleId = lastCompletedCurator.id;
    }
  }

  const cycleTotals = await getCycleSupervisionTotals(
    activeCycle.id,
    activeCycle.targetLevel,
    bonusPractice,
  );

  const usable: SupervisionSummary = {
    practice: cycleTotals.practiceConfirmed,
    supervision: cycleTotals.supervisionConfirmed,
    supervisor: usableRaw.supervisor,
  };
  const pending: SupervisionSummary = {
    practice: cycleTotals.practicePending,
    supervision: cycleTotals.supervisionPending,
    supervisor: pendingRaw.supervisor,
  };

  const percent = {
    practice:
      required.practice > 0
        ? Math.floor((Math.min(usable.practice, required.practice) / required.practice) * 100)
        : 0,
    supervision:
      required.supervision > 0
        ? Math.floor((Math.min(usable.supervision, required.supervision) / required.supervision) * 100)
        : 0,
    supervisor: 0,
  };

  // для админ-матрицы показываем авто-часы в SUPERVISION-ячейке
  matrix.SUPERVISION.CONFIRMED = usable.supervision;
  matrix.SUPERVISION.UNCONFIRMED = pending.supervision;

  return reply.send({
    user: short(user),
    cycle: { id: activeCycle.id, targetLevel: activeCycle.targetLevel, status: CycleStatus.ACTIVE },
    matrix,
    summary: {
      required,
      percent,
      usable,
      pending,
      bonus: bonusPractice > 0 ? { practice: bonusPractice, fromCycleId: bonusSourceCycleId } : null,
      mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null,
    },
  });
}

// ================= helpers ===================
function normalize(type: PracticeLevel | string): Level | null {
  if (
    type === PracticeLevel.INSTRUCTOR ||
    type === PracticeLevel.PRACTICE ||
    type === PracticeLevel.IMPLEMENTING ||
    type === PracticeLevel.PROGRAMMING
  ) {
    return 'PRACTICE';
  }
  if (type === PracticeLevel.SUPERVISOR) return 'SUPERVISOR';
  // SUPERVISION/ CURATOR etc. руками не вводим и не агрегируем как "ручные"
  return null;
}

function matrixEmpty(): Record<Level, Record<RecordStatus, number>> {
  return {
    PRACTICE: { CONFIRMED: 0, UNCONFIRMED: 0, REJECTED: 0, SPENT: 0 },
    SUPERVISION: { CONFIRMED: 0, UNCONFIRMED: 0, REJECTED: 0, SPENT: 0 },
    SUPERVISOR: { CONFIRMED: 0, UNCONFIRMED: 0, REJECTED: 0, SPENT: 0 },
  };
}

function emptySummary(): SupervisionSummary {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

function mentor(u: SupervisionSummary, p: SupervisionSummary) {
  const total = u.supervisor;
  const required = 24;
  return { total, required, percent: Math.floor((total / required) * 100), pending: p.supervisor };
}

function short(u: any) {
  return { id: u.id, email: u.email, fullName: u.fullName };
}

function blank(u: any, matrix: any) {
  return {
    user: short(u),
    matrix,
    summary: { required: null, percent: null, usable: emptySummary(), pending: emptySummary(), mentor: null },
  };
}
