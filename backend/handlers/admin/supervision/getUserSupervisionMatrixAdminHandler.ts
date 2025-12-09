import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  calcAutoSupervisionHours,
  getNextGroupName,
} from '../../../utils/supervisionRequirements';

type Level = 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR';
const LEVELS: Level[] = ['PRACTICE', 'SUPERVISION', 'SUPERVISOR'];
const STATUSES: RecordStatus[] = ['CONFIRMED', 'UNCONFIRMED'];

const RU_BY_LEVEL = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор'
} as const;

const LEVEL_BY_RU: Record<string, 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | undefined> = {
  'Инструктор': 'INSTRUCTOR',
  'Куратор': 'CURATOR',
  'Супервизор': 'SUPERVISOR'
};

interface Route extends RouteGenericInterface { Params: { userId: string } }

type SupervisionSummary = { practice: number; supervision: number; supervisor: number };

// =============== NEW core rules ===============
function getPracticeRange(current: string, target: string | null) {
  if (!target) return null;
  const max = supervisionRequirementsByGroup[target]?.practice ?? null;
  if (!max) return null;

  let min = 0;
  if (current === 'Куратор' && target === 'Супервизор') min = 500; // единственный сдвиг

  return { min, max };
}

export async function getUserSupervisionMatrixAdminHandler(
  req: FastifyRequest<Route>, reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') return reply.code(403).send({ error: 'Только администратор' });
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, fullName: true, targetLevel: true,
      groups: { select: { group: { select: { name: true, rank: true } } } }
    }
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groups = user.groups.map(g => g.group).sort((a, b) => b.rank - a.rank);
  const current = groups[0]?.name;
  if (!current) return reply.send(blank(user, matrixEmpty()));

  // ===== matrix aggregation =====
  const grouped = await prisma.supervisionHour.groupBy({
    by: ['type', 'status'],
    where: { record: { userId }, status: { in: STATUSES } },
    _sum: { value: true }
  });

  const matrix = matrixEmpty();
  for (const g of grouped) {
    const lvl = normalize(g.type);
    if (!lvl) continue;
    matrix[lvl][g.status as RecordStatus] = g._sum.value ?? 0;
  }

  // ========== determine target ==========
  let effective: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null = user.targetLevel ?? null;
  if (!effective) {
    const next = getNextGroupName(current);
    if (next) {
      const lvl = LEVEL_BY_RU[next];
      if (lvl) effective = lvl;
    }
  }

  const target = effective ? RU_BY_LEVEL[effective] : null;
  const required = target ? supervisionRequirementsByGroup[target] ?? null : null;

  // RAW totals (before range logic)
  const usableRaw: SupervisionSummary = {
    practice: matrix.PRACTICE.CONFIRMED,
    supervision: 0,
    supervisor: matrix.SUPERVISOR.CONFIRMED
  };
  const pendingRaw: SupervisionSummary = {
    practice: matrix.PRACTICE.UNCONFIRMED,
    supervision: 0,
    supervisor: matrix.SUPERVISOR.UNCONFIRMED
  };

  const isBasicSupervisor = current === 'Супервизор';

  // ===== no target → only stats & mentor =====
  if (!target || !required) {
    return reply.send({
      user: short(user),
      matrix,
      summary: {
        required: null, percent: null, usable: usableRaw, pending: pendingRaw,
        mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null
      }
    });
  }

  // ===== apply min/max rules =====
  const range = getPracticeRange(current, target);
  if (!range) {
    return reply.send({
      user: short(user),
      matrix,
      summary: {
        required: null, percent: null, usable: usableRaw, pending: pendingRaw,
        mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null
      }
    });
  }

  const { min, max } = range;

  const practiceConfirmed = Math.max(min, Math.min(usableRaw.practice, max));
  const practicePending = Math.max(0, Math.min(usableRaw.practice + pendingRaw.practice, max) - practiceConfirmed);

  // === auto supervision ===
  const autoConfirmed = calcAutoSupervisionHours({ groupName: target, practiceHours: practiceConfirmed });
  const autoPending = Math.max(
    0,
    calcAutoSupervisionHours({ groupName: target, practiceHours: practiceConfirmed + practicePending })
    - autoConfirmed
  );

  const usable = {
    practice: practiceConfirmed,
    supervision: autoConfirmed,
    supervisor: usableRaw.supervisor
  };
  const pending = {
    practice: practicePending,
    supervision: autoPending,
    supervisor: pendingRaw.supervisor
  };

  const percent = {
    practice: pct(practiceConfirmed, min, max),
    supervision: required.supervision > 0 ? Math.floor((autoConfirmed / required.supervision) * 100) : 0,
    supervisor: 0
  };

  // update matrix for admin view (so they see auto-hours too)
  matrix.SUPERVISION.CONFIRMED = autoConfirmed;
  matrix.SUPERVISION.UNCONFIRMED = autoPending;

  return reply.send({
    user: short(user),
    matrix,
    summary: {
      required, percent, usable, pending,
      mentor: isBasicSupervisor ? mentor(usableRaw, pendingRaw) : null
    }
  });
}

// ================= helpers ===================
function normalize(type: string): Level | null {
  if (type === 'INSTRUCTOR' || type === 'PRACTICE') return 'PRACTICE';
  if (type === 'SUPERVISOR') return 'SUPERVISOR';
  return null;
}

function matrixEmpty(): Record<Level, Record<RecordStatus, number>> {
  return {
    PRACTICE: {
      CONFIRMED: 0, UNCONFIRMED: 0,
      REJECTED: 0,
      SPENT: 0
    },
    SUPERVISION: {
      CONFIRMED: 0, UNCONFIRMED: 0,
      REJECTED: 0,
      SPENT: 0
    },
    SUPERVISOR: {
      CONFIRMED: 0, UNCONFIRMED: 0,
      REJECTED: 0,
      SPENT: 0
    }
  }
}
function emptySummary(): SupervisionSummary { return { practice: 0, supervision: 0, supervisor: 0 }; }
function pct(v: number, min: number, max: number) { return max > min ? Math.floor((v - min) / (max - min) * 100) : 0; }

function mentor(u: SupervisionSummary, p: SupervisionSummary) {
  const total = u.supervisor;
  const required = 24;
  return { total, required, percent: Math.floor(total / required * 100), pending: p.supervisor };
}
function short(u: any) { return { id: u.id, email: u.email, fullName: u.fullName }; }
function blank(u: any, matrix: any) {
  return { user: short(u), matrix, summary: { required: null, percent: null, usable: emptySummary(), pending: emptySummary(), mentor: null } }
}
