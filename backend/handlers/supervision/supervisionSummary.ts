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

type Query = { level?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' };

export async function supervisionSummaryHandler(
  req: FastifyRequest<{ Querystring: Query }>,
  reply: FastifyReply
) {
  const { user } = req;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      targetLevel: true, // <-- важно
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

  // Определяем группу, по которой показывать требования:
  // приоритет: ?level -> user.targetLevel -> лесенка (nextGroup от активной)
  const explicitLevel = req.query?.level;
  const targetFromUser = dbUser.targetLevel ?? undefined;

  const targetGroupName =
    (explicitLevel && RU_BY_LEVEL[explicitLevel]) ||
    (targetFromUser && RU_BY_LEVEL[targetFromUser]) ||
    getNextGroupName(primaryGroup.name);

  const required: SupervisionRequirement | null = targetGroupName
    ? supervisionRequirementsByGroup[targetGroupName] ?? null
    : null;

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

  // ---- новая логика: супервизия считается из практики по коэффициенту ----
  let usable: SupervisionSummary = usableRaw;
  let pending: SupervisionSummary = pendingRaw;

  if (targetGroupName) {
    const practiceConfirmed = usableRaw.practice;
    const practicePending = pendingRaw.practice;

    // Сколько супервизии уже есть из подтверждённой практики
    const autoConfirmed = calcAutoSupervisionHours({
      groupName: targetGroupName,
      practiceHours: practiceConfirmed,
    });

    // Сколько будет всего, если подтвердят и ожидающую практику
    const autoTotalIfAllConfirmed = calcAutoSupervisionHours({
      groupName: targetGroupName,
      practiceHours: practiceConfirmed + practicePending,
    });

    const autoPending = Math.max(0, autoTotalIfAllConfirmed - autoConfirmed);

    usable = {
      practice: practiceConfirmed,
      supervision: autoConfirmed,
      // менторские часы живут своей жизнью
      supervisor: usableRaw.supervisor,
    };

    pending = {
      practice: practicePending,
      supervision: autoPending,
      supervisor: pendingRaw.supervisor,
    };
  }

  const percent = required ? computePercent(usable, required) : null;

  // Менторская шкала только для реально "Супервизор/Опытный супервизор" (цель не влияет)
  const isSupervisor =
    primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';
  const mentor = isSupervisor
    ? (() => {
      const total = usable.practice + usable.supervision + usable.supervisor;
      const pendingSum = pending.practice + pending.supervision + pending.supervisor;
      const requiredTotal = 2000; // общая цель для супервизоров
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
  required: SupervisionRequirement
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
