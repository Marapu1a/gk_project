// handlers/supervision/createSupervisionHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createSupervisionSchema } from '../../schemas/supervision';
import {
  RecordStatus,
  PracticeLevel,
  CycleStatus,
  CycleType,
  NotificationType,
  ReviewerCandidateKind,
  TargetLevel,
} from '@prisma/client';
import { createNotification } from '../../utils/notifications';
import {
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
} from '../../utils/supervisionRequirements';
import { getCycleSupervisionTotals } from '../../utils/getCycleSupervisionTotals';

function mapTargetLevel(level: TargetLevel) {
  if (level === TargetLevel.INSTRUCTOR) return 'Инструктор';
  if (level === TargetLevel.CURATOR) return 'Куратор';
  return 'Супервизор';
}

function getRequirements(activeCycle: { targetLevel: TargetLevel; type: CycleType }) {
  const groupName = mapTargetLevel(activeCycle.targetLevel);
  return activeCycle.type === CycleType.RENEWAL
    ? renewalSupervisionRequirementsByGroup[groupName]
    : supervisionRequirementsByGroup[groupName];
}

async function getBonusPracticeHours(userId: string, activeCycle: { targetLevel: TargetLevel; type: CycleType }) {
  if (activeCycle.type === CycleType.RENEWAL || activeCycle.targetLevel !== TargetLevel.SUPERVISOR) {
    return 0;
  }

  const lastCompletedCurator = await prisma.certificationCycle.findFirst({
    where: {
      userId,
      status: CycleStatus.COMPLETED,
      targetLevel: TargetLevel.CURATOR,
    },
    orderBy: { endedAt: 'desc' },
    select: { id: true },
  });

  if (!lastCompletedCurator) return 0;

  const bonusAgg = await prisma.supervisionHour.aggregate({
    where: {
      status: RecordStatus.CONFIRMED,
      type: { in: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING, PracticeLevel.PROGRAMMING] },
      record: { cycleId: lastCompletedCurator.id },
    },
    _sum: { value: true },
  });

  return bonusAgg._sum.value ?? 0;
}

export async function createSupervisionHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const parsed = createSupervisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const {
    fileId,
    entries,
    periodStartedAt,
    periodEndedAt,
    treatmentSetting,
    description,
    ethicsAccepted,
    draftDistribution,
  } = parsed.data;
  const supervisorEmail = parsed.data.supervisorEmail.trim();

  if (periodStartedAt && periodEndedAt && periodEndedAt < periodStartedAt) {
    return reply.code(400).send({ error: 'Дата окончания не может быть раньше даты начала' });
  }

  const now = new Date();
  if (periodStartedAt && periodStartedAt > now) {
    return reply.code(400).send({ error: 'Дата начала не может быть в будущем' });
  }

  if (periodEndedAt && periodEndedAt > now) {
    return reply.code(400).send({ error: 'Дата окончания не может быть в будущем' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });
  if (!activeCycle) {
    return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });
  }

  const reviewer = await prisma.user.findFirst({
    where: { email: { equals: supervisorEmail, mode: 'insensitive' }, archivedAt: null },
    include: { groups: { include: { group: true } } },
    orderBy: [{ email: 'asc' }, { id: 'asc' }],
  });
  if (!reviewer) {
    return reply.code(400).send({ error: 'Супервизор с таким email не найден' });
  }

  if (reviewer.id === userId) {
    return reply.code(400).send({ error: 'SELF_REVIEW_FORBIDDEN' });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  });
  if (!currentUser) {
    return reply.code(400).send({ error: 'Пользователь не найден' });
  }
  if (currentUser.archivedAt) {
    return reply.code(403).send({ error: 'Аккаунт архивирован' });
  }

  const acceptedEthicsAt = currentUser.supervisionEthicsAcceptedAt ?? (ethicsAccepted ? new Date() : null);
  if (!acceptedEthicsAt) {
    return reply.code(400).send({ error: 'Необходимо принять этические принципы IBAO' });
  }

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isAuthorSimpleSupervisor = userGroups.includes('Супервизор');
  const isAuthorExperiencedSupervisor = userGroups.includes('Опытный Супервизор');
  const isAuthorAnySupervisor = isAuthorSimpleSupervisor || isAuthorExperiencedSupervisor;

  const isReviewerAdmin = reviewer.role === 'ADMIN';
  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  if (isAuthorExperiencedSupervisor) {
    return reply.code(400).send({
      error: 'Опытные супервизоры не набирают часы менторства.',
    });
  }

  if (isAuthorSimpleSupervisor && !(isReviewerExperienced || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Менторские часы можно отправлять только опытным супервизорам или админам',
    });
  }

  if (!isAuthorAnySupervisor && !(isReviewerSupervisor || isReviewerAdmin)) {
    return reply.code(400).send({
      error: 'Часы практики можно отправлять только супервизорам, опытным супервизорам или админам',
    });
  }

  if (!entries?.length || entries.some((e) => !(e.value > 0))) {
    return reply.code(400).send({ error: 'Пустые или некорректные часы' });
  }

  const normalized: Array<{ type: PracticeLevel; value: number }> = [];

  if (isAuthorSimpleSupervisor) {
    for (const entry of entries) {
      if (entry.type && entry.type !== 'SUPERVISOR' && entry.type !== 'SUPERVISION') {
        return reply.code(400).send({
          error: 'Для супервизоров разрешены только менторские часы',
        });
      }

      normalized.push({
        type: PracticeLevel.SUPERVISOR,
        value: entry.value,
      });
    }
  } else {
    for (const entry of entries) {
      if (
        entry.type !== 'PRACTICE' &&
        entry.type !== 'IMPLEMENTING' &&
        entry.type !== 'PROGRAMMING'
      ) {
        return reply.code(400).send({
          error: 'Для часов практики разрешены типы PRACTICE, IMPLEMENTING и PROGRAMMING',
        });
      }

      normalized.push({
        type:
          entry.type === 'IMPLEMENTING'
            ? PracticeLevel.IMPLEMENTING
            : entry.type === 'PROGRAMMING'
              ? PracticeLevel.PROGRAMMING
              : PracticeLevel.PRACTICE,
        value: entry.value,
      });
    }
  }

  const relationKind = isAuthorSimpleSupervisor
    ? ReviewerCandidateKind.MENTORSHIP
    : ReviewerCandidateKind.SUPERVISION;

  const requirements = getRequirements(activeCycle);
  const incomingTotal = normalized.reduce((sum, entry) => sum + entry.value, 0);
  if (isAuthorSimpleSupervisor) {
    const mentorCurrent = await prisma.supervisionHour.aggregate({
      where: {
        record: { userId, cycleId: activeCycle.id },
        type: PracticeLevel.SUPERVISOR,
        status: { in: [RecordStatus.CONFIRMED, RecordStatus.UNCONFIRMED] },
      },
      _sum: { value: true },
    });
    const remaining = Math.max(0, (requirements?.supervisor ?? 0) - (mentorCurrent._sum.value ?? 0));
    if (incomingTotal > remaining) {
      return reply.code(400).send({
        error: `Можно добавить не более ${remaining} часов менторства.`,
        remaining,
      });
    }
  } else {
    const bonusPractice = await getBonusPracticeHours(userId, activeCycle);
    const cycleTotals = await getCycleSupervisionTotals(
      activeCycle.id,
      activeCycle.targetLevel,
      bonusPractice,
    );
    const remaining = Math.max(0, (requirements?.practice ?? 0) - cycleTotals.practiceTotalWithPending);
    if (incomingTotal > remaining) {
      return reply.code(400).send({
        error: `Можно добавить не более ${remaining} часов практики для текущего цикла.`,
        remaining,
      });
    }
  }

  const record = await prisma.$transaction(async (tx) => {
    if (!currentUser.supervisionEthicsAcceptedAt && ethicsAccepted) {
      await tx.user.update({
        where: { id: userId },
        data: { supervisionEthicsAcceptedAt: acceptedEthicsAt },
      });
    }

    const createdRecord = await tx.supervisionRecord.create({
      data: {
        userId,
        cycleId: activeCycle.id,
        fileId,
        periodStartedAt,
        periodEndedAt,
        treatmentSetting,
        description,
        ethicsAcceptedAt: acceptedEthicsAt,
        draftDirectIndividual: draftDistribution?.directIndividual,
        draftDirectGroup: draftDistribution?.directGroup,
        draftNonObservingIndividual: draftDistribution?.nonObservingIndividual,
        draftNonObservingGroup: draftDistribution?.nonObservingGroup,
        hours: {
          create: normalized.map(({ type, value }) => ({
            type,
            value,
            status: RecordStatus.UNCONFIRMED,
            reviewerId: reviewer.id,
          })),
        },
      },
      include: { hours: true },
    });

    await tx.reviewerCandidateRelation.upsert({
      where: {
        reviewerId_candidateId_cycleId_kind: {
          reviewerId: reviewer.id,
          candidateId: userId,
          cycleId: activeCycle.id,
          kind: relationKind,
        },
      },
      create: {
        reviewerId: reviewer.id,
        candidateId: userId,
        cycleId: activeCycle.id,
        kind: relationKind,
      },
      update: {},
    });

    return createdRecord;
  });

  try {
    await createNotification({
      userId: reviewer.id,
      type: isAuthorSimpleSupervisor ? NotificationType.MENTORSHIP : NotificationType.SUPERVISION,
      message: `Новая заявка на ${isAuthorSimpleSupervisor ? 'менторство' : 'супервизию'} от ${currentUser.email}`,
      link: isAuthorSimpleSupervisor
        ? '/reviewer/candidates/mentorship'
        : '/reviewer/candidates/supervision',
    });
  } catch (err) {
    req.log.error(err, 'SUPERVISION_CREATE notification failed');
  }

  return reply.code(201).send({ success: true, record });
}
