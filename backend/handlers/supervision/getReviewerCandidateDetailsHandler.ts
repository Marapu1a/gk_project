import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CEUCategory,
  CycleStatus,
  CycleType,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
  TargetLevel,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getCycleSupervisionTotals } from '../../utils/getCycleSupervisionTotals';
import {
  ceuRequirementsByGroup,
  renewalCeuRequirementsByGroup,
  getNextGroupName,
  type CEUSummary,
  type GroupName,
} from '../../utils/ceuRequirements';
import {
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
  type SupervisionRequirement,
} from '../../utils/supervisionRequirements';

type CandidateKind = 'supervision' | 'mentorship';
type Query = { kind?: CandidateKind };
type Params = { userId: string };

type ReviewHour = {
  id: string;
  type: PracticeLevel;
  value: number;
  status: RecordStatus;
  reviewedAt: Date | null;
  rejectedReason: string | null;
};

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

function typesForKind(kind: CandidateKind) {
  return kind === 'mentorship' ? MENTORSHIP_TYPES : SUPERVISION_TYPES;
}

function prismaKind(kind: CandidateKind) {
  return kind === 'mentorship'
    ? ReviewerCandidateKind.MENTORSHIP
    : ReviewerCandidateKind.SUPERVISION;
}

function normalizeKind(value: unknown): CandidateKind {
  return value === 'mentorship' ? 'mentorship' : 'supervision';
}

function emptyCeuSummary(): CEUSummary {
  return { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 };
}

function aggregateCeu(entries: Array<{ category: CEUCategory; value: number }>): CEUSummary {
  const summary = emptyCeuSummary();

  for (const entry of entries) {
    if (entry.category === CEUCategory.ETHICS) summary.ethics += entry.value;
    if (entry.category === CEUCategory.CULTURAL_DIVERSITY) summary.cultDiver += entry.value;
    if (entry.category === CEUCategory.SUPERVISION) summary.supervision += entry.value;
    if (entry.category === CEUCategory.GENERAL) summary.general += entry.value;
  }

  summary.total = summary.ethics + summary.cultDiver + summary.supervision + summary.general;
  return summary;
}

function addCeu(a: CEUSummary, b: CEUSummary): CEUSummary {
  return {
    ethics: a.ethics + b.ethics,
    cultDiver: a.cultDiver + b.cultDiver,
    supervision: a.supervision + b.supervision,
    general: a.general + b.general,
    total: a.total + b.total,
  };
}

function ceuPercent(usable: CEUSummary, required: CEUSummary | null) {
  if (!required) return null;

  return {
    ethics: required.ethics > 0 ? Math.round((Math.min(usable.ethics, required.ethics) / required.ethics) * 100) : 0,
    cultDiver:
      required.cultDiver > 0
        ? Math.round((Math.min(usable.cultDiver, required.cultDiver) / required.cultDiver) * 100)
        : 0,
    supervision:
      required.supervision > 0
        ? Math.round((Math.min(usable.supervision, required.supervision) / required.supervision) * 100)
        : 0,
    general:
      required.general > 0
        ? Math.round((Math.min(usable.general, required.general) / required.general) * 100)
        : 0,
    total: required.total > 0 ? Math.round((Math.min(usable.total, required.total) / required.total) * 100) : 0,
  };
}

function statusSummary(hours: ReviewHour[]) {
  if (!hours.length) {
    return { status: RecordStatus.UNCONFIRMED, reviewedAt: null, rejectedReason: null };
  }

  const statuses = new Set(hours.map((hour) => hour.status));
  const status = statuses.size === 1 ? hours[0].status : RecordStatus.UNCONFIRMED;
  const reviewedAt =
    hours
      .map((hour) => hour.reviewedAt)
      .filter((value): value is Date => value !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const rejectedReason = hours.find((hour) => hour.rejectedReason)?.rejectedReason ?? null;

  return { status, reviewedAt, rejectedReason };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function aggregateRequestHours(hours: ReviewHour[]) {
  return hours.reduce(
    (acc, hour) => ({
      total: round2(acc.total + hour.value),
      implementing: round2(acc.implementing + (hour.type === PracticeLevel.IMPLEMENTING ? hour.value : 0)),
      programming: round2(acc.programming + (hour.type === PracticeLevel.PROGRAMMING ? hour.value : 0)),
      legacyPractice: round2(
        acc.legacyPractice +
          (hour.type === PracticeLevel.PRACTICE ||
          hour.type === PracticeLevel.INSTRUCTOR ||
          hour.type === PracticeLevel.CURATOR
            ? hour.value
            : 0),
      ),
      mentor: round2(
        acc.mentor +
          (hour.type === PracticeLevel.SUPERVISOR || hour.type === PracticeLevel.SUPERVISION
            ? hour.value
            : 0),
      ),
    }),
    { total: 0, implementing: 0, programming: 0, legacyPractice: 0, mentor: 0 },
  );
}

function aggregatePracticeBreakdown(rows: Array<{ type: PracticeLevel; value: number }>) {
  const summary = {
    total: 0,
    legacy: 0,
    implementing: 0,
    programming: 0,
    bonus: 0,
  };

  for (const row of rows) {
    if (row.type === PracticeLevel.IMPLEMENTING) summary.implementing += row.value;
    if (row.type === PracticeLevel.PROGRAMMING) summary.programming += row.value;
    if (
      row.type === PracticeLevel.PRACTICE ||
      row.type === PracticeLevel.INSTRUCTOR ||
      row.type === PracticeLevel.CURATOR
    ) {
      summary.legacy += row.value;
    }
  }

  summary.total = summary.legacy + summary.implementing + summary.programming + summary.bonus;

  return {
    total: round2(summary.total),
    legacy: round2(summary.legacy),
    implementing: round2(summary.implementing),
    programming: round2(summary.programming),
    bonus: 0,
  };
}

function aggregateDistribution(
  records: Array<{
    draftDirectIndividual: number | null;
    draftDirectGroup: number | null;
    draftNonObservingIndividual: number | null;
    draftNonObservingGroup: number | null;
  }>,
  supervisionTotal: number,
) {
  const directIndividual = round2(
    records.reduce((sum, record) => sum + (record.draftDirectIndividual ?? 0), 0),
  );
  const directGroup = round2(
    records.reduce((sum, record) => sum + (record.draftDirectGroup ?? 0), 0),
  );
  const nonObservingIndividual = round2(
    records.reduce((sum, record) => sum + (record.draftNonObservingIndividual ?? 0), 0),
  );
  const nonObservingGroup = round2(
    records.reduce((sum, record) => sum + (record.draftNonObservingGroup ?? 0), 0),
  );
  const direct = round2(directIndividual + directGroup);
  const nonObserving = round2(nonObservingIndividual + nonObservingGroup);
  const distributedTotal = round2(direct + nonObserving);

  return {
    total: supervisionTotal,
    direct,
    nonObserving,
    directIndividual,
    directGroup,
    nonObservingIndividual,
    nonObservingGroup,
    distributedTotal,
    remaining: round2(Math.max(0, supervisionTotal - distributedTotal)),
  };
}

function serializeRequest(record: {
  id: string;
  createdAt: Date;
  periodStartedAt: Date | null;
  periodEndedAt: Date | null;
  treatmentSetting: string | null;
  description: string | null;
  draftDirectIndividual: number | null;
  draftDirectGroup: number | null;
  draftNonObservingIndividual: number | null;
  draftNonObservingGroup: number | null;
  hours: ReviewHour[];
}) {
  const summary = statusSummary(record.hours);
  const actionHour = record.hours.find((hour) => hour.status === RecordStatus.UNCONFIRMED) ?? null;
  const directIndividual = record.draftDirectIndividual ?? 0;
  const directGroup = record.draftDirectGroup ?? 0;
  const nonObservingIndividual = record.draftNonObservingIndividual ?? 0;
  const nonObservingGroup = record.draftNonObservingGroup ?? 0;

  return {
    id: record.id,
    createdAt: record.createdAt,
    periodStartedAt: record.periodStartedAt,
    periodEndedAt: record.periodEndedAt,
    treatmentSetting: record.treatmentSetting,
    description: record.description,
    status: summary.status,
    reviewedAt: summary.reviewedAt,
    rejectedReason: summary.rejectedReason,
    actionHourId: actionHour?.id ?? null,
    hours: record.hours,
    totals: aggregateRequestHours(record.hours),
    distribution: {
      directIndividual: round2(directIndividual),
      directGroup: round2(directGroup),
      nonObservingIndividual: round2(nonObservingIndividual),
      nonObservingGroup: round2(nonObservingGroup),
      direct: round2(directIndividual + directGroup),
      nonObserving: round2(nonObservingIndividual + nonObservingGroup),
    },
  };
}

async function getReviewerCapabilities(reviewerId: string, role?: string) {
  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    select: { groups: { select: { group: { select: { name: true } } } } },
  });

  if (!reviewer) return null;

  const groupNames = reviewer.groups.map((item) => item.group.name);
  const isAdmin = role === 'ADMIN';
  const isExperiencedSupervisor = groupNames.includes('Опытный Супервизор');
  const isSupervisor = groupNames.includes('Супервизор') || isExperiencedSupervisor;

  return {
    isAdmin,
    isSupervisor,
    isExperiencedSupervisor,
    canReviewSupervision: isAdmin || isSupervisor,
    canReviewMentorship: isAdmin || isExperiencedSupervisor,
  };
}

function resolveCeuRequirement(params: {
  activeCycle: { type: CycleType; targetLevel: TargetLevel };
  candidateTargetLevel: TargetLevel | null;
  primaryGroupName: string | null;
}) {
  const { activeCycle, candidateTargetLevel, primaryGroupName } = params;

  if (activeCycle.type === CycleType.RENEWAL) {
    const groupName = RU_BY_LEVEL[activeCycle.targetLevel] as GroupName;
    return renewalCeuRequirementsByGroup[groupName] ?? null;
  }

  const targetGroupName =
    (candidateTargetLevel && RU_BY_LEVEL[candidateTargetLevel]) ||
    (primaryGroupName ? getNextGroupName(primaryGroupName) : null);

  return (targetGroupName && ceuRequirementsByGroup[targetGroupName as GroupName]) || null;
}

function resolveSupervisionRequirement(activeCycle: {
  type: CycleType;
  targetLevel: TargetLevel;
}): SupervisionRequirement | null {
  const groupName = RU_BY_LEVEL[activeCycle.targetLevel];
  return activeCycle.type === CycleType.RENEWAL
    ? renewalSupervisionRequirementsByGroup[groupName] ?? null
    : supervisionRequirementsByGroup[groupName] ?? null;
}

export async function getReviewerCandidateDetailsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const reviewerId = req.user?.userId;
  const reviewerRole = req.user?.role;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const { userId: candidateId } = req.params as Params;
  const query = (req.query ?? {}) as Query;
  const requestedKind = normalizeKind(query.kind);
  const capabilities = await getReviewerCapabilities(reviewerId, reviewerRole);

  if (!capabilities) return reply.code(404).send({ error: 'Проверяющий не найден' });
  if (!capabilities.canReviewSupervision) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }
  if (requestedKind === 'mentorship' && !capabilities.canReviewMentorship) {
    return reply.code(403).send({ error: 'Доступ к менторству запрещён' });
  }

  const candidate = await prisma.user.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      archivedAt: true,
      targetLevel: true,
      groups: { select: { group: { select: { id: true, name: true, rank: true } } } },
    },
  });

  if (!candidate) return reply.code(404).send({ error: 'Кандидат не найден' });
  if (candidate.archivedAt) return reply.code(404).send({ error: 'Кандидат не найден' });

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: candidateId, status: CycleStatus.ACTIVE },
    select: { id: true, type: true, targetLevel: true, startedAt: true },
  });

  if (!activeCycle) {
    return reply.code(404).send({ error: 'У кандидата нет активного цикла' });
  }

  const relation = await prisma.reviewerCandidateRelation.findUnique({
    where: {
      reviewerId_candidateId_cycleId_kind: {
        reviewerId,
        candidateId,
        cycleId: activeCycle.id,
        kind: prismaKind(requestedKind),
      },
    },
    select: { status: true },
  });

  if (!relation || relation.status !== ReviewerCandidateStatus.ACCEPTED) {
    return reply.code(403).send({ error: 'Кандидат ещё не принят проверяющим' });
  }

  const requestedKindAccessCount = await prisma.supervisionRecord.count({
    where: {
      userId: candidateId,
      cycleId: activeCycle.id,
      hours: {
        some: {
          reviewerId,
          type: { in: typesForKind(requestedKind) },
        },
      },
    },
  });

  if (requestedKindAccessCount === 0) {
    return reply.code(403).send({ error: 'Нет заявок этого кандидата, адресованных вам' });
  }

  const [supervisionRecords, mentorshipRecords] = await Promise.all([
    prisma.supervisionRecord.findMany({
      where: {
        userId: candidateId,
        cycleId: activeCycle.id,
        hours: {
          some: { reviewerId, type: { in: SUPERVISION_TYPES } },
        },
      },
      select: {
        id: true,
        createdAt: true,
        periodStartedAt: true,
        periodEndedAt: true,
        treatmentSetting: true,
        description: true,
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
        hours: {
          where: { reviewerId, type: { in: SUPERVISION_TYPES } },
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
            reviewedAt: true,
            rejectedReason: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    capabilities.canReviewMentorship
      ? prisma.supervisionRecord.findMany({
          where: {
            userId: candidateId,
            cycleId: activeCycle.id,
            hours: {
              some: { reviewerId, type: { in: MENTORSHIP_TYPES } },
            },
          },
          select: {
            id: true,
            createdAt: true,
            periodStartedAt: true,
            periodEndedAt: true,
            treatmentSetting: true,
            description: true,
            draftDirectIndividual: true,
            draftDirectGroup: true,
            draftNonObservingIndividual: true,
            draftNonObservingGroup: true,
            hours: {
              where: { reviewerId, type: { in: MENTORSHIP_TYPES } },
              select: {
                id: true,
                type: true,
                value: true,
                status: true,
                reviewedAt: true,
                rejectedReason: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const groupList = candidate.groups.map((item) => item.group).sort((a, b) => b.rank - a.rank);
  const primaryGroup = groupList[0] ?? null;

  const [
    confirmedCeu,
    spentCeu,
    supervisionTotals,
    confirmedPracticeHours,
    distributionRecords,
    confirmedMentorHours,
    pendingMentorHours,
  ] = await Promise.all([
    prisma.cEUEntry.findMany({
      where: { status: RecordStatus.CONFIRMED, record: { cycleId: activeCycle.id } },
      select: { category: true, value: true },
    }),
    prisma.cEUEntry.findMany({
      where: { status: RecordStatus.SPENT, record: { cycleId: activeCycle.id } },
      select: { category: true, value: true },
    }),
    getCycleSupervisionTotals(activeCycle.id, activeCycle.targetLevel),
    prisma.supervisionHour.findMany({
      where: {
        status: RecordStatus.CONFIRMED,
        type: { in: SUPERVISION_TYPES },
        record: { cycleId: activeCycle.id },
      },
      select: { type: true, value: true },
    }),
    prisma.supervisionRecord.findMany({
      where: {
        cycleId: activeCycle.id,
        hours: {
          some: {},
          every: { status: RecordStatus.CONFIRMED },
        },
      },
      select: {
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
      },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        status: RecordStatus.CONFIRMED,
        type: { in: MENTORSHIP_TYPES },
        record: { cycleId: activeCycle.id },
      },
      _sum: { value: true },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        status: RecordStatus.UNCONFIRMED,
        type: { in: MENTORSHIP_TYPES },
        record: { cycleId: activeCycle.id },
      },
      _sum: { value: true },
    }),
  ]);

  const ceuUsable = aggregateCeu(confirmedCeu);
  const ceuSpent = aggregateCeu(spentCeu);
  const ceuTotal = addCeu(ceuUsable, ceuSpent);
  const ceuRequired = resolveCeuRequirement({
    activeCycle,
    candidateTargetLevel: candidate.targetLevel,
    primaryGroupName: primaryGroup?.name ?? null,
  });

  const supervisionRequired = resolveSupervisionRequirement(activeCycle);
  const mentorRequired = supervisionRequired?.supervisor ?? 0;
  const mentorTotal = round2(confirmedMentorHours._sum.value ?? 0);
  const mentorPending = round2(pendingMentorHours._sum.value ?? 0);

  return reply.send({
    candidate: {
      id: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      avatarUrl: candidate.avatarUrl,
      targetLevel: candidate.targetLevel,
      primaryGroup,
      groups: groupList,
    },
    activeCycle,
    permissions: {
      canReviewSupervision: capabilities.canReviewSupervision,
      canReviewMentorship: capabilities.canReviewMentorship,
      requestedKind,
    },
    ceuSummary: {
      required: ceuRequired,
      percent: ceuPercent(ceuUsable, ceuRequired),
      usable: ceuUsable,
      spent: ceuSpent,
      total: ceuTotal,
    },
    supervisionSummary: {
      required: supervisionRequired,
      practiceConfirmed: supervisionTotals.practiceConfirmed,
      practicePending: supervisionTotals.practicePending,
      supervisionConfirmed: supervisionTotals.supervisionConfirmed,
      supervisionPending: supervisionTotals.supervisionPending,
      practiceBreakdown: aggregatePracticeBreakdown(confirmedPracticeHours),
      supervisionBreakdown: aggregateDistribution(
        distributionRecords,
        supervisionTotals.supervisionConfirmed,
      ),
      mentor: mentorRequired > 0
        ? {
            total: mentorTotal,
            required: mentorRequired,
            percent:
              mentorRequired > 0
                ? Math.floor((Math.min(mentorTotal, mentorRequired) / mentorRequired) * 100)
                : 0,
            pending: mentorPending,
          }
        : null,
    },
    requests: {
      supervision: supervisionRecords.map(serializeRequest),
      mentorship: mentorshipRecords.map(serializeRequest),
    },
  });
}
