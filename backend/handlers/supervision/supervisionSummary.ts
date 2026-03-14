// src/handlers/supervision/supervisionSummary.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { PracticeLevel, CycleStatus, TargetLevel } from '@prisma/client';
import { supervisionRequirementsByGroup, calcAutoSupervisionHours } from '../../utils/supervisionRequirements';

type SupervisionSummary = {
  practice: number;
  supervision: number;
  supervisor: number; // менторские часы (для супервизоров)
};

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export async function supervisionSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },
    },
  });

  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  // ⚠️ Без активного цикла — ничего не показываем
  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true },
  });

  if (!activeCycle) {
    return reply.send({
      required: null,
      percent: null,
      usable: empty(),
      pending: empty(),
      mentor: null,
      bonus: null,
    });
  }

  const groups = dbUser.groups.map((g) => g.group).sort((a, b) => b.rank - a.rank);
  const current = groups[0]?.name;

  if (!current) {
    return reply.send({
      required: null,
      percent: null,
      usable: empty(),
      pending: empty(),
      mentor: null,
      bonus: null,
    });
  }

  const isBasicSupervisor = current === 'Супервизор';

  // target — строго из цикла
  const targetRu = RU_BY_LEVEL[activeCycle.targetLevel];
  const reqSet = supervisionRequirementsByGroup[targetRu] ?? null;

  // ---- собираем PRACTICE/SUPERVISOR по статусам (ТОЛЬКО ACTIVE CYCLE)
  const [confirmed, unconfirmed] = await Promise.all([
    prisma.supervisionHour.findMany({
      where: {
        status: 'CONFIRMED',
        type: { in: [PracticeLevel.PRACTICE, PracticeLevel.SUPERVISOR] },
        record: { cycleId: activeCycle.id },
      },
      select: { type: true, value: true },
    }),
    prisma.supervisionHour.findMany({
      where: {
        status: 'UNCONFIRMED',
        type: { in: [PracticeLevel.PRACTICE, PracticeLevel.SUPERVISOR] },
        record: { cycleId: activeCycle.id },
      },
      select: { type: true, value: true },
    }),
  ]);

  const usableRaw = aggregate(confirmed);
  const pendingRaw = aggregate(unconfirmed);

  // ---- бонус: если целимся в SUPERVISOR, добавляем PRACTICE из последнего COMPLETED CURATOR цикла
  let bonusPractice = 0;
  let bonusSourceCycleId: string | null = null;

  if (activeCycle.targetLevel === TargetLevel.SUPERVISOR) {
    const lastCompletedCurator = await prisma.certificationCycle.findFirst({
      where: {
        userId: user.userId,
        status: CycleStatus.COMPLETED,
        targetLevel: TargetLevel.CURATOR,
      },
      orderBy: { endedAt: 'desc' }, // берём последний завершённый
      select: { id: true },
    });

    if (lastCompletedCurator) {
      const bonusAgg = await prisma.supervisionHour.aggregate({
        where: {
          status: 'CONFIRMED',
          type: PracticeLevel.PRACTICE,
          record: { cycleId: lastCompletedCurator.id },
        },
        _sum: { value: true },
      });

      bonusPractice = bonusAgg._sum.value ?? 0;
      bonusSourceCycleId = lastCompletedCurator.id;
    }
  }

  // ---- если target/reqSet не определены → просто статистика (в рамках цикла)
  if (!reqSet) {
    const mentor = isBasicSupervisor ? calcMentor(usableRaw, pendingRaw) : null;
    return reply.send({
      required: null,
      percent: null,
      usable: usableRaw,
      pending: pendingRaw,
      mentor,
      bonus: bonusPractice > 0 ? { practice: bonusPractice, fromCycleId: bonusSourceCycleId } : null,
    });
  }

  // ---- считаем "итоговую практику" для автосупервизии
  const practiceConfirmedTotal = usableRaw.practice + bonusPractice;
  const practiceTotalWithPending = usableRaw.practice + pendingRaw.practice + bonusPractice;

  const autoConfirmed = calcAutoSupervisionHours({
    groupName: targetRu,
    practiceHours: practiceConfirmedTotal,
  });

  const autoTotalWithPending = calcAutoSupervisionHours({
    groupName: targetRu,
    practiceHours: practiceTotalWithPending,
  });

  const autoPending = Math.max(0, autoTotalWithPending - autoConfirmed);

  const usable: SupervisionSummary = {
    practice: practiceConfirmedTotal,
    supervision: autoConfirmed,
    supervisor: usableRaw.supervisor,
  };

  const pending: SupervisionSummary = {
    practice: pendingRaw.practice, // бонус не "на проверке"
    supervision: autoPending,
    supervisor: pendingRaw.supervisor,
  };

  const percent = {
    practice:
      reqSet.practice > 0
        ? Math.floor((Math.min(usable.practice, reqSet.practice) / reqSet.practice) * 100)
        : 0,
    supervision:
      reqSet.supervision > 0
        ? Math.floor((Math.min(usable.supervision, reqSet.supervision) / reqSet.supervision) * 100)
        : 0,
    supervisor: 0,
  };

  const mentor = isBasicSupervisor ? calcMentor(usableRaw, pendingRaw) : null;

  return reply.send({
    required: reqSet,
    percent,
    usable,
    pending,
    mentor,
    bonus: bonusPractice > 0 ? { practice: bonusPractice, fromCycleId: bonusSourceCycleId } : null,
  });
}

// ================= helpers ==================

function empty(): SupervisionSummary {
  return { practice: 0, supervision: 0, supervisor: 0 };
}

function aggregate(rows: Array<{ type: PracticeLevel; value: number }>): SupervisionSummary {
  const s = empty();
  for (const h of rows) {
    if (h.type === PracticeLevel.PRACTICE) s.practice += h.value;
    if (h.type === PracticeLevel.SUPERVISOR) s.supervisor += h.value;
  }
  return s;
}

function calcMentor(usable: SupervisionSummary, pending: SupervisionSummary) {
  const total = usable.supervisor;
  const requiredTotal = 24;
  const percent = Math.floor((total / requiredTotal) * 100);
  return { total, required: requiredTotal, percent, pending: pending.supervisor };
}
