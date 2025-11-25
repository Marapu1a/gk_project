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
  req: FastifyRequest<{ Querystring: Query }>,
  reply: FastifyReply,
) {
  const { user } = req;
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

  // ----------------- определяем целевой уровень / группу -----------------

  const explicitLevel = req.query?.level;
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

  // если нет цели (например, верхняя ступень) — просто отдаём нули
  if (!targetGroupName || !required) {
    // всё равно посчитаем usable/pending, чтобы фронт мог их показать как "просто статистику"
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

    const usable = aggregate(confirmed);
    const pending = aggregate(unconfirmed);

    const isSupervisor =
      primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';

    const mentor = isSupervisor
      ? (() => {
        const total = usable.practice + usable.supervision + usable.supervisor;
        const pendingSum = pending.practice + pending.supervision + pending.supervisor;
        const requiredTotal = 24; // ⬅️ МАКСИМУМ МЕНТОРСКИХ ЧАСОВ
        const pct = requiredTotal
          ? clampPct(Math.round((total / requiredTotal) * 100))
          : 0;
        return { total, required: requiredTotal, percent: pct, pending: pendingSum };
      })()
      : null;

    return reply.send({
      required: null,
      percent: null,
      usable,
      pending,
      mentor,
    });
  }

  // ----------------- собираем часы из базы -----------------

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

  // ----------------- трек и сгорание инструкторских часов -----------------

  // по ТЗ: сгорают только инструкторские часы при движении дальше
  // записи в базе вечные, режем только "учитываемую" часть

  const burnedBase = getBurnedBaseForTrack({
    primaryGroupName: primaryGroup.name,
    targetLevel: effectiveLevel,
  });

  // сколько практики считаем для ЭТОГО трека (после сгорания)
  const practiceConfirmedForTrack = Math.max(0, usableRaw.practice - burnedBase.practice);
  const practicePendingForTrack = pendingRaw.practice; // pending считаем как текущий трек

  // авто-супервизия считаем только от практики текущего трека
  const autoConfirmed = calcAutoSupervisionHours({
    groupName: targetGroupName,
    practiceHours: practiceConfirmedForTrack,
  });

  const autoTotalIfAllConfirmed = calcAutoSupervisionHours({
    groupName: targetGroupName,
    practiceHours: practiceConfirmedForTrack + practicePendingForTrack,
  });

  const autoPending = Math.max(0, autoTotalIfAllConfirmed - autoConfirmed);

  // usable/pending в разрезе текущего трека:
  // practice — уже с учётом сгорания инструкторских часов
  let usable: SupervisionSummary = {
    practice: practiceConfirmedForTrack,
    supervision: autoConfirmed,
    supervisor: usableRaw.supervisor,
  };

  let pending: SupervisionSummary = {
    practice: practicePendingForTrack,
    supervision: autoPending,
    supervisor: pendingRaw.supervisor,
  };

  // проценты считаем от "usable" по треку и требований к целевой группе
  const percent = computePercent(usable, required);

  // Менторская шкала только для реальных супервизоров
  const isSupervisor =
    primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';

  const mentor = isSupervisor
    ? (() => {
      const total = usable.practice + usable.supervision + usable.supervisor;
      const pendingSum = pending.practice + pending.supervision + pending.supervisor;
      const requiredTotal = 24; // ⬅️ МАКСИМУМ МЕНТОРСКИХ ЧАСОВ
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
 * - если цель = INSTRUCTOR → ничего не сгорает, считаем всё с нуля до 300/10
 * - если человек уже Инструктор и идёт дальше (CURATOR или SUPERVISOR),
 *   инструкторские часы (300 практики, 10 супервизии) не учитываем в прогрессе
 * - для Куратора и Супервизора часы не сгорают, они накапливаются
 */
function getBurnedBaseForTrack(params: {
  primaryGroupName: string;
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
}): { practice: number; supervision: number } {
  const { primaryGroupName, targetLevel } = params;

  if (!targetLevel) return { practice: 0, supervision: 0 };

  // трек на Инструктора — идём с нуля, ничего не режем
  if (targetLevel === 'INSTRUCTOR') return { practice: 0, supervision: 0 };

  // если пользователь уже Инструктор и идёт выше (на Куратора или сразу на Супервизора),
  // инструкторские часы выкидываем из расчёта прогресса:
  // с 0 до 300 он шёл на инструктора, дальше новый трек с нуля
  if (primaryGroupName === 'Инструктор') {
    const instReq = supervisionRequirementsByGroup['Инструктор'];
    return {
      practice: instReq.practice,       // 300
      supervision: instReq.supervision, // 10
    };
  }

  // во всех прочих случаях (Соискатель, Куратор и т.д.) — ничего не сгорает
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
