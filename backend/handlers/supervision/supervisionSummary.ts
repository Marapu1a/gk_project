import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getNextGroupName,
  getPrevGroupName,
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
      targetLevel: true,
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

  const explicitLevel = req.query?.level;
  const targetFromUser = dbUser.targetLevel ?? undefined;

  const targetGroupName =
    (explicitLevel && RU_BY_LEVEL[explicitLevel]) ||
    (targetFromUser && RU_BY_LEVEL[targetFromUser]) ||
    getNextGroupName(primaryGroup.name);

  const required: SupervisionRequirement | null = targetGroupName
    ? supervisionRequirementsByGroup[targetGroupName] ?? null
    : null;

  const prevGroupName = targetGroupName ? getPrevGroupName(targetGroupName) : null;
  const prevReq = prevGroupName
    ? supervisionRequirementsByGroup[prevGroupName]
    : null;

  const prevPracticeFloor = prevReq?.practice ?? 0;

  // Берём подтверждённые и "на проверке" параллельно
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

  let usable: SupervisionSummary = usableRaw;
  let pending: SupervisionSummary = pendingRaw;

  if (targetGroupName) {
    const practiceConfirmedRaw = usableRaw.practice;
    const practicePendingRaw = pendingRaw.practice;

    // ✅ ключевая правка: считаем только дельту относительно предыдущего уровня
    const practiceConfirmed = Math.max(0, practiceConfirmedRaw - prevPracticeFloor);
    const practicePending = practicePendingRaw;

    const autoConfirmed = calcAutoSupervisionHours({
      groupName: targetGroupName,
      practiceHours: practiceConfirmed,
    });

    const autoTotalIfAllConfirmed = calcAutoSupervisionHours({
      groupName: targetGroupName,
      practiceHours: practiceConfirmed + practicePending,
    });

    const autoPending = Math.max(0, autoTotalIfAllConfirmed - autoConfirmed);

    usable = {
      practice: practiceConfirmedRaw, // показываем пользователю все накопленные часы
      supervision: autoConfirmed,
      supervisor: usableRaw.supervisor,
    };

    pending = {
      practice: practicePendingRaw,
      supervision: autoPending,
      supervisor: pendingRaw.supervisor,
    };
  }

  const percent = required ? computePercent(usable, required) : null;

  // Менторская шкала только для реальных супервизоров
  const isSupervisor =
    primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';

  const mentor = isSupervisor
    ? (() => {
      const total = usable.practice + usable.supervision + usable.supervisor;
      const pendingSum = pending.practice + pending.supervision + pending.supervisor;
      const requiredTotal = 2000;
      const pct = clampPct(Math.round((total / requiredTotal) * 100));
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
