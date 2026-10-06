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
  calcAutoRenewalSupervisionHours,
  calcAutoSupervisionHours,
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
} from '../../utils/supervisionRequirements';
import { targetLevelToGroupName as mapTargetLevel } from '../../domain/levels';
import { getSupervisorBonusPracticeHours } from '../../utils/getSupervisorBonusPracticeHours';
import { splitLegacyPractice } from '../../domain/supervision/legacyPracticeRequest';
import {
  getCumulativePracticeBalanceError,
  resolveCumulativePracticeBalance,
} from '../../domain/supervision/practiceBalance';
import { aggregatePracticeBreakdown } from '../../domain/supervision/practiceBreakdown';
import { reportOperationalFailure } from '../../lib/errorMonitoring';
import {
  getDistributionPracticeLinkError,
  getSupervisionDistributionError,
} from '../../domain/supervision/distributionRules';

const PRACTICE_REVIEWER_REQUIRED_MESSAGE =
  'Заявку на подтверждение часов практики можно отправить только супервизорам, которые есть в реестре. Напишите в поддержку, если вашего супервизора нет в системе или что-то пошло не так.';
const MENTOR_REVIEWER_REQUIRED_MESSAGE =
  'Заявку на подтверждение часов менторства можно отправить только наставникам, которые есть в системе. Напишите в поддержку, если вашего наставника нет в системе или что-то пошло не так.';
const SUPERVISION_DATE_REQUIRED_MESSAGE = 'Укажите дату проведения супервизии.';
const MENTORSHIP_DATE_REQUIRED_MESSAGE = 'Укажите дату получения наставничества (менторства).';
const SUPERVISION_DATE_IN_FUTURE_MESSAGE = 'Дата проведения супервизии не может быть в будущем';
const MENTORSHIP_DATE_IN_FUTURE_MESSAGE =
  'Дата получения наставничества (менторства) не может быть в будущем';

class SupervisionHoursLimitError extends Error {
  constructor(
    message: string,
    readonly remaining: number,
  ) {
    super(message);
  }
}

function getRequirements(activeCycle: { targetLevel: TargetLevel; type: CycleType }) {
  const groupName = mapTargetLevel(activeCycle.targetLevel);
  return activeCycle.type === CycleType.RENEWAL
    ? renewalSupervisionRequirementsByGroup[groupName]
    : supervisionRequirementsByGroup[groupName];
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
    supervisionDate,
    periodStartedAt,
    periodEndedAt,
    treatmentSetting,
    description,
    ethicsAccepted,
    draftDistribution,
  } = parsed.data;
  const supervisorEmail = parsed.data.supervisorEmail.trim();

  const now = new Date();

  if (periodStartedAt && periodEndedAt && periodEndedAt < periodStartedAt) {
    return reply.code(400).send({ error: 'Дата окончания практики не может быть раньше даты начала.' });
  }

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
  const requestDateRequiredMessage = isAuthorSimpleSupervisor
    ? MENTORSHIP_DATE_REQUIRED_MESSAGE
    : SUPERVISION_DATE_REQUIRED_MESSAGE;
  const requestDateInFutureMessage = isAuthorSimpleSupervisor
    ? MENTORSHIP_DATE_IN_FUTURE_MESSAGE
    : SUPERVISION_DATE_IN_FUTURE_MESSAGE;

  if (supervisionDate && supervisionDate > now) {
    return reply.code(400).send({ error: requestDateInFutureMessage });
  }

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
      error: 'Опытные супервизоры не набирают часы практики и менторства.',
    });
  }

  const resolvedSupervisionDate = supervisionDate ?? (isAuthorSimpleSupervisor ? periodStartedAt : null);

  if (!resolvedSupervisionDate) {
    return reply.code(400).send({ error: requestDateRequiredMessage });
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

      if (entry.type === 'PRACTICE') {
        const split = splitLegacyPractice(entry.value);
        normalized.push(
          { type: PracticeLevel.IMPLEMENTING, value: split.implementing },
          { type: PracticeLevel.PROGRAMMING, value: split.programming },
        );
      } else {
        normalized.push({
          type:
            entry.type === 'IMPLEMENTING'
              ? PracticeLevel.IMPLEMENTING
              : PracticeLevel.PROGRAMMING,
          value: entry.value,
        });
      }
    }
  }

  const relationKind = isAuthorSimpleSupervisor
    ? ReviewerCandidateKind.MENTORSHIP
    : ReviewerCandidateKind.SUPERVISION;

  if (!isAuthorAnySupervisor && draftDistribution) {
    const implementing = normalized
      .filter((entry) => entry.type === PracticeLevel.IMPLEMENTING)
      .reduce((sum, entry) => sum + entry.value, 0);
    const programming = normalized
      .filter((entry) => entry.type === PracticeLevel.PROGRAMMING)
      .reduce((sum, entry) => sum + entry.value, 0);
    const distributionPracticeLinkError = getDistributionPracticeLinkError({
      implementing,
      programming,
      distribution: draftDistribution,
    });
    if (distributionPracticeLinkError) {
      return reply.code(400).send({ error: distributionPracticeLinkError });
    }
  }

  const requirements = getRequirements(activeCycle);
  const incomingTotal = normalized.reduce((sum, entry) => sum + entry.value, 0);
  const bonusPractice = isAuthorSimpleSupervisor
    ? 0
    : (await getSupervisorBonusPracticeHours(userId, activeCycle)).value;

  let record;
  try {
    record = await prisma.$transaction(async (tx) => {
      // Заявки одного цикла считаются последовательно, чтобы параллельные вкладки
      // не смогли использовать один и тот же остаток часов.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${activeCycle.id}))`;
      const currentCycle = await tx.certificationCycle.findUnique({
        where: { id: activeCycle.id },
        select: { status: true },
      });
      if (currentCycle?.status !== CycleStatus.ACTIVE) throw new Error('CYCLE_CHANGED');

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
        const [confirmed, pending, correction, legacyDistribution, distributionRecords] =
          await Promise.all([
          tx.supervisionHour.groupBy({
            by: ['type'],
            where: {
              record: { userId, cycleId: activeCycle.id },
              type: { in: practiceTypes },
              status: RecordStatus.CONFIRMED,
            },
            _sum: { value: true },
          }),
          tx.supervisionHour.groupBy({
            by: ['type'],
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
            select: {
              implementing: true,
              programming: true,
              directIndividual: true,
              directGroup: true,
              nonObservingIndividual: true,
              nonObservingGroup: true,
              updatedAt: true,
            },
          }),
          tx.supervisionDistribution.findUnique({
            where: { cycleId: activeCycle.id },
            select: {
              directIndividual: true,
              directGroup: true,
              nonObservingIndividual: true,
              nonObservingGroup: true,
            },
          }),
          tx.supervisionRecord.findMany({
            where: {
              userId,
              cycleId: activeCycle.id,
              hours: { some: { type: { in: practiceTypes } } },
            },
            select: {
              draftDirectIndividual: true,
              draftDirectGroup: true,
              draftNonObservingIndividual: true,
              draftNonObservingGroup: true,
              hours: {
                where: { type: { in: practiceTypes } },
                select: { status: true, reviewedAt: true },
              },
            },
          }),
        ]);
        const confirmedBreakdown = aggregatePracticeBreakdown(confirmed);
        const pendingBreakdown = aggregatePracticeBreakdown(pending);
        const confirmedRowsAfterCorrection = correction
          ? await tx.supervisionHour.groupBy({
                by: ['type'],
                where: {
                  record: { userId, cycleId: activeCycle.id },
                  type: { in: practiceTypes },
                  status: RecordStatus.CONFIRMED,
                  reviewedAt: { gt: correction.updatedAt },
                },
                _sum: { value: true },
              })
          : null;
        const confirmedAfterCorrection = confirmedRowsAfterCorrection
          ? aggregatePracticeBreakdown(confirmedRowsAfterCorrection)
          : confirmedBreakdown;
        const currentBalance = resolveCumulativePracticeBalance({
          confirmed: confirmedAfterCorrection,
          pending: pendingBreakdown,
          correction,
          neutralBonus: bonusPractice,
        });
        const confirmedPractice = correction
          ? correction.implementing +
            correction.programming +
            confirmedAfterCorrection.implementing +
            confirmedAfterCorrection.programming
          : confirmedBreakdown.total;
        const current = confirmedPractice + bonusPractice + pendingBreakdown.total;
        const remaining = Math.max(0, (requirements?.practice ?? 0) - current);
        if (incomingTotal > remaining) {
          throw new SupervisionHoursLimitError(
            `Можно добавить не более ${remaining} часов практики для текущей сертификации.`,
            remaining,
          );
        }

        if (draftDistribution && requirements?.practice && requirements.supervision > 0) {
          const baseDistribution = distributionRecords.reduce(
            (sum, record) => {
              const isConfirmed =
                record.hours.length > 0 &&
                record.hours.every((hour) => hour.status === RecordStatus.CONFIRMED);
              const isPending =
                record.hours.length > 0 &&
                record.hours.every((hour) => hour.status === RecordStatus.UNCONFIRMED);
              const isEffectiveConfirmed =
                isConfirmed &&
                (!correction ||
                  record.hours.some(
                    (hour) => hour.reviewedAt != null && hour.reviewedAt > correction.updatedAt,
                  ));
              if (!isPending && !isEffectiveConfirmed) return sum;

              return {
                directIndividual: sum.directIndividual + (record.draftDirectIndividual ?? 0),
                directGroup: sum.directGroup + (record.draftDirectGroup ?? 0),
                nonObservingIndividual:
                  sum.nonObservingIndividual + (record.draftNonObservingIndividual ?? 0),
                nonObservingGroup:
                  sum.nonObservingGroup + (record.draftNonObservingGroup ?? 0),
              };
            },
            correction
              ? {
                  directIndividual: correction.directIndividual,
                  directGroup: correction.directGroup,
                  nonObservingIndividual: correction.nonObservingIndividual,
                  nonObservingGroup: correction.nonObservingGroup,
                }
              : {
                  directIndividual: legacyDistribution?.directIndividual ?? 0,
                  directGroup: legacyDistribution?.directGroup ?? 0,
                  nonObservingIndividual: legacyDistribution?.nonObservingIndividual ?? 0,
                  nonObservingGroup: legacyDistribution?.nonObservingGroup ?? 0,
                },
          );
          const calculateSupervision = (practiceHours: number) => {
            const calculated =
              activeCycle.type === CycleType.RENEWAL
                ? calcAutoRenewalSupervisionHours({ groupName: mapTargetLevel(activeCycle.targetLevel), practiceHours })
                : calcAutoSupervisionHours({ groupName: mapTargetLevel(activeCycle.targetLevel), practiceHours });
            return Math.min(calculated, requirements.supervision);
          };
          const baseDistributedSupervision =
            baseDistribution.directIndividual +
            baseDistribution.directGroup +
            baseDistribution.nonObservingIndividual +
            baseDistribution.nonObservingGroup;
          const expectedIncomingSupervision = Math.max(
            0,
            calculateSupervision(current + incomingTotal) - baseDistributedSupervision,
          );
          const distributionTotal =
            draftDistribution.directIndividual +
            draftDistribution.directGroup +
            draftDistribution.nonObservingIndividual +
            draftDistribution.nonObservingGroup;
          const distributionError = getSupervisionDistributionError({
            expectedSupervision: expectedIncomingSupervision,
            distribution: draftDistribution,
            baseSupervision: baseDistributedSupervision,
            baseGroup: baseDistribution.directGroup + baseDistribution.nonObservingGroup,
          });
          if (distributionError || Math.abs(distributionTotal - expectedIncomingSupervision) >= 0.01) {
            throw new SupervisionHoursLimitError(
              distributionError ??
                'Сумма часов, распределённых по типам супервизии, должна совпадать с рассчитанным количеством часов супервизии.',
              remaining,
            );
          }
        }

        if (requirements?.practice) {
          const incomingBreakdown = aggregatePracticeBreakdown(
            normalized.map((entry) => ({ type: entry.type, _sum: { value: entry.value } })),
          );
          const balanceError = getCumulativePracticeBalanceError({
            requiredPractice: requirements.practice,
            current: currentBalance,
            added: incomingBreakdown,
          });
          if (balanceError) {
            throw new SupervisionHoursLimitError(balanceError, remaining);
          }
        }
      }

      if (!currentUser.supervisionEthicsAcceptedAt && ethicsAccepted) {
        await tx.user.update({
          where: { id: userId },
          data: { supervisionEthicsAcceptedAt: acceptedEthicsAt },
        });
      }

      const relationKey = {
        reviewerId: reviewer.id,
        candidateId: userId,
        cycleId: activeCycle.id,
        kind: relationKind,
      };
      const existingRelation = await tx.reviewerCandidateRelation.findFirst({
        where: { ...relationKey, status: { in: [ReviewerCandidateStatus.PENDING, ReviewerCandidateStatus.ACCEPTED] } },
        select: { id: true },
      });
      if (!existingRelation) await tx.reviewerCandidateRelation.create({ data: relationKey });

      const createdRecord = await tx.supervisionRecord.create({
        data: {
          userId,
          cycleId: activeCycle.id,
          fileId,
          supervisionDate: resolvedSupervisionDate,
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

      return createdRecord;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CYCLE_CHANGED') {
      return reply.code(409).send({ error: 'Сертификация уже завершена. Обновите страницу перед отправкой часов.' });
    }
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
    reportOperationalFailure(
      'supervision_request_notification',
      err,
      { userId, reviewerId: reviewer.id, recordId: record.id, requestId: req.id },
      req.log,
    );
  }

  return reply.code(201).send({ success: true, record });
}
