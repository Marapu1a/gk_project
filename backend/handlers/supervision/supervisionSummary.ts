// handlers/ceuSummary/supervisionSummary.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, RecordStatus } from '@prisma/client';

type SupervisionSummary = {
  instructor: number;
  curator: number;
  supervisor: number; // = менторские
};

const SUPERVISION_KEYS: (keyof SupervisionSummary)[] = ['instructor', 'curator', 'supervisor'];

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

  // CONFIRMED
  const confirmed = await prisma.supervisionHour.findMany({
    where: { record: { userId: user.userId }, status: RecordStatus.CONFIRMED },
    select: { type: true, value: true },
  });
  const usable = aggregate(confirmed);

  // UNCONFIRMED (для колонки "На проверке")
  const unconfirmed = await prisma.supervisionHour.findMany({
    where: { record: { userId: user.userId }, status: RecordStatus.UNCONFIRMED },
    select: { type: true, value: true },
  });
  const pending = aggregate(unconfirmed);

  // Требования для следующей группы (как и раньше)
  const nextGroup = getNextGroupName(primaryGroup.name);
  const required = nextGroup ? hourRequirementsByGroup[nextGroup] : null;
  const percent = required ? computePercent(usable, required) : null;

  // Доп. блок для супервизоров: «Часы менторства» = instructor + curator + supervisor
  const isSupervisor =
    primaryGroup.name === 'Супервизор' || primaryGroup.name === 'Опытный Супервизор';

  const mentor = isSupervisor
    ? (() => {
      const total = usable.instructor + usable.curator + usable.supervisor;
      const pendingSum = pending.instructor + pending.curator + pending.supervisor;
      const requiredTotal = 2000; // общая цель (1000 уже могло быть накоплено до супервизора)
      const percent = clampPct(Math.round((total / requiredTotal) * 100));
      return { total, required: requiredTotal, percent, pending: pendingSum };
    })()
    : null;

  return reply.send({ required, percent, usable, pending, mentor });
}

function empty(): SupervisionSummary {
  return { instructor: 0, curator: 0, supervisor: 0 };
}

function aggregate(entries: Array<{ type: PracticeLevel; value: number }>): SupervisionSummary {
  const s = empty();
  for (const h of entries) {
    switch (h.type) {
      case PracticeLevel.INSTRUCTOR:
        s.instructor += h.value; break;
      case PracticeLevel.CURATOR:
        s.curator += h.value; break;
      case PracticeLevel.SUPERVISOR:
        s.supervisor += h.value; break; // менторские
    }
  }
  return s;
}

function computePercent(usable: SupervisionSummary, required: SupervisionSummary): SupervisionSummary {
  const p = empty();
  for (const k of SUPERVISION_KEYS) {
    p[k] = required[k] > 0 ? clampPct(Math.round((usable[k] / required[k]) * 100)) : 0;
  }
  return p;
}

function clampPct(x: number) { return Math.max(0, Math.min(100, x)); }

function getNextGroupName(current: string): string | null {
  const order = ['Студент', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'];
  const i = order.indexOf(current);
  return i >= 0 && i + 1 < order.length ? order[i + 1] : null;
}

// Требования к переходу на следующую группу (по категориям)
const hourRequirementsByGroup: Record<string, SupervisionSummary> = {
  'Инструктор': { instructor: 150, curator: 150, supervisor: 0 },
  'Куратор': { instructor: 300, curator: 300, supervisor: 0 },
  'Супервизор': { instructor: 500, curator: 500, supervisor: 0 },
  // Для "Опытный Супервизор" по категориям не требуем instr/cur; менторская цель считается сверху как mentor.required=2000
  'Опытный Супервизор': { instructor: 0, curator: 0, supervisor: 0 },
};
