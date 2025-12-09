import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  calcAutoSupervisionHours,
  getNextGroupName,
} from '../../utils/supervisionRequirements';

type SupervisionSummary = {
  practice: number;
  supervision: number;
  supervisor: number;
};

const SUMMARY_KEYS: (keyof SupervisionSummary)[] = ['practice', 'supervision', 'supervisor'];

const RU_BY_LEVEL = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

const LEVEL_BY_RU: Record<string, 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | undefined> = {
  'Инструктор': 'INSTRUCTOR',
  'Куратор': 'CURATOR',
  'Супервизор': 'SUPERVISOR',
};

type Query = { level?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' };

// =============================================================
//  💡 НОВАЯ МОДЕЛЬ
//  minPractice = 500 только при (current='Куратор' && target='Супервизор')
//  иначе min=0
//  max=requirePractice[target]
// =============================================================
function getPracticeRange(current: string, target: string | null) {
  if (!target) return null;

  const max = supervisionRequirementsByGroup[target]?.practice ?? null;
  if (!max) return null;

  let min = 0;
  if (current === 'Куратор' && target === 'Супервизор') min = 500;

  return { min, max };
}

// =============================================================
//  Главный handler — переписан начисто
// =============================================================
export async function supervisionSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      targetLevel: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groups = dbUser.groups.map(g => g.group).sort((a, b) => b.rank - a.rank);
  const current = groups[0]?.name;                 // активная квалификация

  if (!current) {
    return reply.send({ required: null, percent: null, usable: empty(), pending: empty(), mentor: null });
  }

  // ---- определяем target
  const q = (req.query ?? {}) as Query;
  const explicit = q.level;
  const userTarget = dbUser.targetLevel ?? null;

  let effective: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null =
    explicit || userTarget || null;

  if (!effective) {
    const next = getNextGroupName(current);
    if (next) {
      const lvl = LEVEL_BY_RU[next];
      if (lvl) effective = lvl;
    }
  }

  const target = effective ? RU_BY_LEVEL[effective] : null;
  const reqSet = target ? supervisionRequirementsByGroup[target] : null;

  // ---- собираем practice/supervisor по статусам
  const [confirmed, unconfirmed] = await Promise.all([
    prisma.supervisionHour.findMany({ where: { record: { userId: user.userId }, status: 'CONFIRMED' }, select: { type: true, value: true } }),
    prisma.supervisionHour.findMany({ where: { record: { userId: user.userId }, status: 'UNCONFIRMED' }, select: { type: true, value: true } })
  ]);

  const usableRaw = aggregate(confirmed);
  const pendingRaw = aggregate(unconfirmed);

  // ---- если target не определён → просто статистика
  const isBasicSupervisor = current === 'Супервизор';

  if (!target || !reqSet) {
    const mentor = isBasicSupervisor ? calcMentor(usableRaw, pendingRaw) : null;
    return reply.send({ required: null, percent: null, usable: usableRaw, pending: pendingRaw, mentor });
  }

  // ---- новая формула min/max
  const range = getPracticeRange(current, target);
  if (!range) {
    const mentor = isBasicSupervisor ? calcMentor(usableRaw, pendingRaw) : null;
    return reply.send({ required: null, percent: null, usable: usableRaw, pending: pendingRaw, mentor });
  }

  const { min, max } = range;

  const practiceConfirmed = Math.max(0, Math.min(usableRaw.practice, max));
  const practicePending = Math.max(0, Math.min(usableRaw.practice + pendingRaw.practice, max)) - practiceConfirmed;

  // ---- авто супервизия без burn
  const autoConfirmed = calcAutoSupervisionHours({ groupName: target, practiceHours: practiceConfirmed });
  const autoPending = Math.max(0,
    calcAutoSupervisionHours({ groupName: target, practiceHours: practiceConfirmed + practicePending })
    - autoConfirmed
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
    supervision: reqSet.supervision > 0 ? Math.floor((autoConfirmed / reqSet.supervision) * 100) : 0,
    supervisor: 0,
  };

  const mentor = isBasicSupervisor ? calcMentor(usableRaw, pendingRaw) : null;

  return reply.send({ required: reqSet, percent, usable, pending, mentor });
}


// ================= helpers ==================

function empty(): SupervisionSummary {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

function aggregate(rows: Array<{ type: PracticeLevel, value: number }>): SupervisionSummary {
  const s = empty();
  for (const h of rows) {
    switch (h.type) {
      case 'PRACTICE':
      case 'INSTRUCTOR': s.practice += h.value; break;
      case 'SUPERVISION':
      case 'CURATOR': s.supervision += h.value; break; // авто всё равно пересчитываем
      case 'SUPERVISOR': s.supervisor += h.value; break;
    }
  }
  return s;
}

function pct(confirmed: number, min: number, max: number) {
  return max > min ? Math.floor((confirmed - min) / (max - min) * 100) : 0;
}

function calcMentor(usable: SupervisionSummary, pending: SupervisionSummary) {
  const total = usable.supervisor;
  const requiredTotal = 24;
  const pct = Math.floor((total / requiredTotal) * 100);
  return { total, required: requiredTotal, percent: pct, pending: pending.supervisor };
}
