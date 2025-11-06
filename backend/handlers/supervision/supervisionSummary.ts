import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';
import {
  supervisionRequirementsByGroup,
  getNextGroupName,
  type SupervisionRequirement,
} from '../../utils/supervisionRequirements';

type SupervisionSummary = {
  practice: number;
  supervision: number;
  supervisor: number; // менторские
};

const SUMMARY_KEYS: (keyof SupervisionSummary)[] = ['practice', 'supervision', 'supervisor'];

export async function supervisionSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { groups: { include: { group: true } } },
  });
  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = dbUser.groups.map(g => g.group).sort((a, b) => b.rank - a.rank);
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

  // Берём все подтверждённые часы
  const confirmed = await prisma.supervisionHour.findMany({
    where: { record: { userId: user.userId }, status: RecordStatus.CONFIRMED },
    select: { type: true, value: true },
  });
  const usable = aggregate(confirmed);

  // И все "на проверке"
  const unconfirmed = await prisma.supervisionHour.findMany({
    where: { record: { userId: user.userId }, status: RecordStatus.UNCONFIRMED },
    select: { type: true, value: true },
  });
  const pending = aggregate(unconfirmed);

  const nextGroup = getNextGroupName(primaryGroup.name);
  const required = nextGroup ? supervisionRequirementsByGroup[nextGroup] : null;
  const percent = required ? computePercent(usable, required) : null;

  const isSupervisor =
    primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';

  const mentor = isSupervisor
    ? (() => {
      const total = usable.practice + usable.supervision + usable.supervisor;
      const pendingSum = pending.practice + pending.supervision + pending.supervisor;
      const requiredTotal = 2000; // общая цель для супервизоров
      const percent = clampPct(Math.round((total / requiredTotal) * 100));
      return { total, required: requiredTotal, percent, pending: pendingSum };
    })()
    : null;

  return reply.send({ required, percent, usable, pending, mentor });
}

// ----------------- helpers -----------------

function empty(): SupervisionSummary {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

// агрегирует значения по типу
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

function computePercent(usable: SupervisionSummary, required: SupervisionRequirement): SupervisionSummary {
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
