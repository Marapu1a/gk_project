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
  ReviewerCandidateStatus,
  SupervisionAdminCorrectionKind,
  TargetLevel,
} from '@prisma/client';
import { createNotification } from '../../utils/notifications';
import {
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
} from '../../utils/supervisionRequirements';

const PRACTICE_REVIEWER_REQUIRED_MESSAGE =
  'Заявку на подтверждение часов практики можно отправить только супервизорам, которые есть в системе. Напишите в поддержку, если вашего супервизора нет в системе или что-то пошло не так.';
const MENTOR_REVIEWER_REQUIRED_MESSAGE =
  'Заявку на подтверждение часов менторства можно отправить только наставникам, которые есть в системе. Напишите в поддержку, если вашего наставника нет в системе или что-то пошло не так.';

class SupervisionHoursLimitError extends Error {
  constructor(
    message: string,
    readonly remaining: number,
  ) {
    super(message);
  }
}

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

async function getBonusPracticeHours(
  userId: string,
  activeCycle: { targetLevel: TargetLevel; type: CycleType },
) {
  if (
    activeCycle.type === CycleType.RENEWAL ||
    activeCycle.targetLevel !== TargetLevel.SUPERVISOR
  ) {
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

  const userGroups = currentUser.groups.map((g) => g.group.name);
  const isAuthorSimpleSupervisor = userGroups.includes('Супервизор');
  const isAuthorExperiencedSupervisor = userGroups.includes('Опытный Супервизор');
  const isAuthorAnySupervisor = isAuthorSimpleSupervisor || isAuthorExperiencedSupervisor;
  const reviewerRequiredMessage = isAuthorSimpleSupervisor
    ? MENTOR_REVIEWER_REQUIRED_MESSAGE
    : PRACTICE_REVIEWER_REQUIRED_MESSAGE;

  if (!periodStartedAt) {
    return reply.code(400).send({ error: 'Укажите дату начала периода.' });
  }

  if (!periodEndedAt) {
    return reply.code(400).send({ error: 'Укажите дату окончания периода.' });
  }

  const reviewer = await prisma.user.findFirst({
    where: { email: { equals: supervisorEmail, mode: 'insensitive' }, archivedAt: null },
    include: { groups: { include: { group: true } } },
    orderBy: [{ email: 'asc' }, { id: 'asc' }],
  });
  if (!reviewer) {
    return reply.code(400).send({ error: reviewerRequiredMessage });
  }

  if (reviewer.id === userId) {
    return reply.code(400).send({ error: 'SELF_REVIEW_FORBIDDEN' });
  }

  const acceptedEthicsAt =
    currentUser.supervisionEthicsAcceptedAt ?? (ethicsAccepted ? new Date() : null);
  if (!acceptedEthicsAt) {
    return reply.code(400).send({ error: 'Необходимо принять этические принципы IBAO' });
  }

  const reviewerGroups = reviewer.groups.map((g) => g.group.name);

  const isReviewerExperienced = reviewerGroups.includes('Опытный Супервизор');
  const isReviewerSupervisor = reviewerGroups.includes('Супервизор') || isReviewerExperienced;

  if (isAuthorExperiencedSupervisor) {
    return reply.code(400).send({
      error: 'Опытные супервизоры не набирают часы менторства.',
    });
  }

  if (isAuthorSimpleSupervisor && !isReviewerExperienced) {
    return reply.code(400).send({
      error: MENTOR_REVIEWER_REQUIRED_MESSAGE,
    });
  }

  if (!isAuthorAnySupervisor && !isReviewerSupervisor) {
    return reply.code(400).send({
      error: PRACTICE_REVIEWER_REQUIRED_MESSAGE,
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
  const bonusPractice = isAuthorSimpleSupervisor
    ? 0
    : await getBonusPracticeHours(userId, activeCycle);

  let record;
  try {
    record = await prisma.$transaction(async (tx) => {
      // Заявки одного цикла считаются последовательно, чтобы параллельные вкладки
      // не смогли использовать один и тот же остаток часов.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${activeCycle.id}))`;

      if (isAuthorSimpleSupervisor) {
        const [mentorConfirmed, mentorPending, mentorCorrection] = await Promise.all([
          tx.supervisionHour.aggregate({
            where: {
              record: { userId, cycleId: activeCycle.id },
              type: PracticeLevel.SUPERVISOR,
              status: RecordStatus.CONFIRMED,
            },
            _sum: { value: true },
          }),
          tx.supervisionHour.aggregate({
            where: {
              record: { userId, cycleId: activeCycle.id },
              type: PracticeLevel.SUPERVISOR,
              status: RecordStatus.UNCONFIRMED,
            },
            _sum: { value: true },
          }),
          tx.supervisionAdminCorrection.findUnique({
            where: {
              cycleId_kind: {
                cycleId: activeCycle.id,
                kind: SupervisionAdminCorrectionKind.MENTORSHIP,
              },
            },
            select: { mentor: true },
          }),
        ]);
        const current =
          (mentorCorrection?.mentor ?? mentorConfirmed._sum.value ?? 0) +
          (mentorPending._sum.value ?? 0);
        const remaining = Math.max(0, (requirements?.supervisor ?? 0) - current);
        if (incomingTotal > remaining) {
          throw new SupervisionHoursLimitError(
            `Можно добавить не более ${remaining} часов менторства.`,
            remaining,
          );
        }
      } else {
        const practiceTypes = [
          PracticeLevel.PRACTICE,
          PracticeLevel.IMPLEMENTING,
          PracticeLevel.PROGRAMMING,
        ];
        const [confirmed, pending, correction] = await Promise.all([
          tx.supervisionHour.aggregate({
            where: {
              record: { userId, cycleId: activeCycle.id },
              type: { in: practiceTypes },
              status: RecordStatus.CONFIRMED,
            },
            _sum: { value: true },
          }),
          tx.supervisionHour.aggregate({
            where: {
              record: { userId, cycleId: activeCycle.id },
              type: { in: practiceTypes },
              status: RecordStatus.UNCONFIRMED,
            },
            _sum: { value: true },
          }),
          tx.supervisionAdminCorrection.findUnique({
            where: {
              cycleId_kind: {
                cycleId: activeCycle.id,
                kind: SupervisionAdminCorrectionKind.PRACTICE,
              },
            },
            select: { implementing: true, programming: true },
          }),
        ]);
        const confirmedPractice = correction
          ? correction.implementing + correction.programming
          : (confirmed._sum.value ?? 0);
        const current = confirmedPractice + bonusPractice + (pending._sum.value ?? 0);
        const remaining = Math.max(0, (requirements?.practice ?? 0) - current);
        if (incomingTotal > remaining) {
          throw new SupervisionHoursLimitError(
            `Можно добавить не более ${remaining} часов практики для текущего цикла.`,
            remaining,
          );
        }
      }

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

      const relationKey = {
        reviewerId: reviewer.id,
        candidateId: userId,
        cycleId: activeCycle.id,
        kind: relationKind,
      };
      const existingRelation = await tx.reviewerCandidateRelation.findUnique({
        where: { reviewerId_candidateId_cycleId_kind: relationKey },
        select: { id: true, status: true },
      });

      if (!existingRelation) {
        await tx.reviewerCandidateRelation.create({ data: relationKey });
      } else if (existingRelation.status === ReviewerCandidateStatus.REJECTED) {
        await tx.reviewerCandidateRelation.update({
          where: { id: existingRelation.id },
          data: { status: ReviewerCandidateStatus.PENDING },
        });
      }

      return createdRecord;
    });
  } catch (error) {
    if (error instanceof SupervisionHoursLimitError) {
      return reply.code(400).send({ error: error.message, remaining: error.remaining });
    }
    throw error;
  }

  try {
    await createNotification({
      userId: reviewer.id,
      type: isAuthorSimpleSupervisor ? NotificationType.MENTORSHIP : NotificationType.SUPERVISION,
      message: `Новая заявка на ${isAuthorSimpleSupervisor ? 'менторство' : 'супервизию'} от ${currentUser.email}`,
      link: isAuthorSimpleSupervisor
        ? '/reviewer/candidates/mentorship?status=UNCONFIRMED'
        : '/reviewer/candidates/supervision?status=UNCONFIRMED',
    });
  } catch (err) {
    req.log.error(err, 'SUPERVISION_CREATE notification failed');
  }

  return reply.code(201).send({ success: true, record });
}
