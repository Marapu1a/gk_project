// src/handlers/admin/supervision/getUserSupervisionMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { PracticeLevel, RecordStatus, CycleStatus, TargetLevel } from '@prisma/client';
import { supervisionRequirementsByGroup, calcAutoSupervisionHours } from '../../../utils/supervisionRequirements';

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

// =============== core rules ===============
function getPracticeRange(current: string, targetRu: RequirementsGroupKey | null) {
  if (!targetRu) return null;

  const max = supervisionRequirementsByGroup[targetRu]?.practice ?? null;
  if (!max) return null;

  let min = 0;
  if (current === 'Куратор' && targetRu === 'Супервизор') min = 500;

  return { min, max };
}

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

  // ===== apply min/max rules =====
  const range = getPracticeRange(current, targetRu);
  if (!range) {
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

  const { min, max } = range;

  const practiceConfirmed = Math.max(min, Math.min(usableRaw.practice, max));
  const practicePending = Math.max(
    0,
    Math.min(usableRaw.practice + pendingRaw.practice, max) - practiceConfirmed
  );

  // === auto supervision ===
  const autoConfirmed = calcAutoSupervisionHours({ groupName: targetRu, practiceHours: practiceConfirmed });
  const autoPending = Math.max(
    0,
    calcAutoSupervisionHours({ groupName: targetRu, practiceHours: practiceConfirmed + practicePending }) -
    autoConfirmed
  );

  const usable: SupervisionSummary = {
    practice: practiceConfirmed,
    supervision: autoConfirmed,
    supervisor: usableRaw.supervisor,
  };
  const pending: SupervisionSummary = {
    practice: practicePending,
    supervision: autoPending,
    supervisor: pendingRaw.supervisor,
  };

  const percent = {
    practice: pct(practiceConfirmed, min, max),
    supervision: required.supervision > 0 ? Math.floor((autoConfirmed / required.supervision) * 100) : 0,
    supervisor: 0,
  };

  // для админ-матрицы показываем авто-часы в SUPERVISION-ячейке
  matrix.SUPERVISION.CONFIRMED = autoConfirmed;
  matrix.SUPERVISION.UNCONFIRMED = autoPending;

  return reply.send({
    user: short(user),
    cycle: { id: activeCycle.id, targetLevel: activeCycle.targetLevel, status: CycleStatus.ACTIVE },
    matrix,
    summary: {
      required,
      percent,
      usable,
      pending,
      mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null,
    },
  });
}

// ================= helpers ===================
function normalize(type: PracticeLevel | string): Level | null {
  if (type === PracticeLevel.INSTRUCTOR || type === PracticeLevel.PRACTICE) return 'PRACTICE';
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

function pct(v: number, min: number, max: number) {
  return max > min ? Math.floor(((v - min) / (max - min)) * 100) : 0;
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
