import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getNextGroupName,
  type SupervisionRequirement,
  calcAutoSupervisionHours,
} from '../../utils/supervisionRequirements';

type SupervisionSummary = {
  practice: number;
  supervision: number;
  supervisor: number; // менторские
};

const SUMMARY_KEYS: (keyof SupervisionSummary)[] = ['practice', 'supervision', 'supervisor'];

// enum-уровень цели -> русское имя группы, чьи требования показывать
const RU_BY_LEVEL: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const LEVEL_BY_RU: Record<string, 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | undefined> = {
  'Инструктор': 'INSTRUCTOR',
  'Куратор': 'CURATOR',
  'Супервизор': 'SUPERVISOR',
};

type Query = { level?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' };

export async function supervisionSummaryHandler(
  req: FastifyRequest, // 🔹 убрали дженерик с Querystring
  reply: FastifyReply,
) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      targetLevel: true, // выбор трека: INSTRUCTOR | CURATOR | SUPERVISOR
      groups: {
        select: {
          group: { select: { id: true, name: true, rank: true } },
        },
      },
    },
  });

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0];

  if (!primaryGroup) {
    return reply.send({
      required: null,
      percent: null,
      usable: empty(),
      pending: empty(),
      mentor: null,
    });
  }

  const hasInstructorGroup = groupList.some((g) => g.name === 'Инструктор');

  // ----------------- определяем целевой уровень / группу -----------------

  const q = (req.query ?? {}) as Query;
  const explicitLevel = q.level;
  const targetFromUser = dbUser.targetLevel ?? undefined;

  // сначала enum-уровень, потом уже русское имя
  let effectiveLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null =
    explicitLevel || targetFromUser || null;

  if (!effectiveLevel) {
    const nextGroupName = getNextGroupName(primaryGroup.name);
    if (nextGroupName) {
      const lvl = LEVEL_BY_RU[nextGroupName];
      if (lvl) effectiveLevel = lvl;
    }
  }

  const targetGroupName = effectiveLevel ? RU_BY_LEVEL[effectiveLevel] : null;

  const required: SupervisionRequirement | null = targetGroupName
    ? supervisionRequirementsByGroup[targetGroupName] ?? null
    : null;

  // ----------------- собираем часы из базы (один раз) -----------------

  const [confirmed, unconfirmed] = await Promise.all([
    prisma.supervisionHour.findMany({
      where: { record: { userId: user.userId }, status: RecordStatus.CONFIRMED },
      select: { type: true, value: true },
    }),
    prisma.supervisionHour.findMany({
      where: { record: { userId: user.userId }, status: RecordStatus.UNCONFIRMED },
      select: { type: true, value: true },
    }),
  ]);

  const usableRaw = aggregate(confirmed);
  const pendingRaw = aggregate(unconfirmed);

  // ----------------- кейс: цели нет, просто статистика + менторство -----------------

  const isBasicSupervisor = primaryGroup.name === 'Супервизор';

  if (!targetGroupName || !required) {
    const mentor = isBasicSupervisor
      ? (() => {
        // менторство: считаем только SUPERVISOR-часы, цель 24
        const total = usableRaw.supervisor;
        const pendingSum = pendingRaw.supervisor;
        const requiredTotal = 24;
        const pct = requiredTotal
          ? clampPct(Math.round((total / requiredTotal) * 100))
          : 0;
        return { total, required: requiredTotal, percent: pct, pending: pendingSum };
      })()
      : null;

    return reply.send({
      required: null,
      percent: null,
      usable: usableRaw,
      pending: pendingRaw,
      mentor,
    });
  }

  // ----------------- трек и СГОРАНИЕ инструкторских -----------------
  // Инструкторские 300/10 сгорают во всех треках выше инструктора,
  // если пользователь когда-либо был в группе "Инструктор".
  const burnedBase = getBurnedBaseForTrack({
    hasInstructorGroup,
    targetLevel: effectiveLevel,
  });

  const practiceConfirmedForTrack = Math.max(0, usableRaw.practice - burnedBase.practice);
  const practicePendingForTrack = pendingRaw.practice;

  // авто-супервизия считаем от practiceConfirmedForTrack
  const autoConfirmed = calcAutoSupervisionHours({
    groupName: targetGroupName,
    practiceHours: practiceConfirmedForTrack,
  });

  const autoTotalIfAllConfirmed = calcAutoSupervisionHours({
    groupName: targetGroupName,
    practiceHours: practiceConfirmedForTrack + practicePendingForTrack,
  });

  const autoPending = Math.max(0, autoTotalIfAllConfirmed - autoConfirmed);

  const usable: SupervisionSummary = {
    practice: practiceConfirmedForTrack,
    supervision: autoConfirmed,
    supervisor: usableRaw.supervisor,
  };

  const pending: SupervisionSummary = {
    practice: practicePendingForTrack,
    supervision: autoPending,
    supervisor: pendingRaw.supervisor,
  };

  const percent = computePercent(usable, required);

  // Менторская шкала только для простых супервизоров
  const mentor = isBasicSupervisor
    ? (() => {
      const total = usable.supervisor;
      const pendingSum = pending.supervisor;
      const requiredTotal = 24;
      const pct = requiredTotal
        ? clampPct(Math.round((total / requiredTotal) * 100))
        : 0;
      return { total, required: requiredTotal, percent: pct, pending: pendingSum };
    })()
    : null;

  return reply.send({ required, percent, usable, pending, mentor });
}

// ----------------- helpers -----------------

function empty(): SupervisionSummary {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

function aggregate(entries: Array<{ type: PracticeLevel; value: number }>): SupervisionSummary {
  const s = empty();
  for (const h of entries) {
    switch (h.type) {
      case PracticeLevel.PRACTICE:
      case PracticeLevel.INSTRUCTOR:
        s.practice += h.value;
        break;
      case PracticeLevel.SUPERVISION:
      case PracticeLevel.CURATOR:
        s.supervision += h.value;
        break;
      case PracticeLevel.SUPERVISOR:
        s.supervisor += h.value;
        break;
    }
  }
  return s;
}

/**
 * Сгорание инструкторских часов:
 *
 * - цель = INSTRUCTOR → ничего не сгорает
 * - цель = CURATOR или SUPERVISOR и пользователь когда-либо был "Инструктором" →
 *   выкидываем 300/10 (инструкторский пакет) из прогресса.
 * - если группы "Инструктор" нет (чел сразу пошёл на Куратора/Супервизора) → не жжём.
 */
function getBurnedBaseForTrack(params: {
  hasInstructorGroup: boolean;
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
}): { practice: number; supervision: number } {
  const { hasInstructorGroup, targetLevel } = params;

  if (!targetLevel || targetLevel === 'INSTRUCTOR') {
    return { practice: 0, supervision: 0 };
  }

  if (hasInstructorGroup && (targetLevel === 'CURATOR' || targetLevel === 'SUPERVISOR')) {
    const instReq = supervisionRequirementsByGroup['Инструктор'];
    return {
      practice: instReq.practice, // 300
      supervision: instReq.supervision, // 10
    };
  }

  return { practice: 0, supervision: 0 };
}

function computePercent(
  usable: SupervisionSummary,
  required: SupervisionRequirement,
): SupervisionSummary {
  const p = empty();
  for (const k of SUMMARY_KEYS) {
    const req = (required as any)[k] ?? 0;
    p[k] = req > 0 ? clampPct(Math.round((usable[k] / req) * 100)) : 0;
  }
  return p;
}

function clampPct(x: number) {
  return Math.max(0, Math.min(100, x));
}
