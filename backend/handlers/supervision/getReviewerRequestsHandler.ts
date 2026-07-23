import { FastifyReply, FastifyRequest } from 'fastify';
import {
  PracticeLevel,
  Prisma,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';

type CandidateKind = 'supervision' | 'mentorship';
type RequestStatus = 'ALL' | 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';
type Query = {
  kind?: CandidateKind;
  status?: RequestStatus;
  candidate?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
  nameSort?: 'asc' | 'desc';
  page?: string;
  limit?: string;
};

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];

function normalizeKind(value: unknown): CandidateKind {
  return value === 'mentorship' ? 'mentorship' : 'supervision';
}

function normalizeStatus(value: unknown): RequestStatus {
  return value === 'UNCONFIRMED' || value === 'CONFIRMED' || value === 'REJECTED'
    ? value
    : 'ALL';
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function endOfUtcDay(value: string) {
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requestStatus(hours: Array<{ status: RecordStatus }>) {
  if (hours.some((hour) => hour.status === RecordStatus.UNCONFIRMED)) {
    return RecordStatus.UNCONFIRMED;
  }
  if (hours.some((hour) => hour.status === RecordStatus.REJECTED)) {
    return RecordStatus.REJECTED;
  }
  if (hours.some((hour) => hour.status === RecordStatus.SPENT)) {
    return RecordStatus.SPENT;
  }
  return RecordStatus.CONFIRMED;
}

function serializeRequest(record: any) {
  const hours = record.hours;
  const status = requestStatus(hours);
  const actionHour = hours.find((hour: any) => hour.status === RecordStatus.UNCONFIRMED) ?? null;
  const reviewedAt =
    hours
      .map((hour: any) => hour.reviewedAt)
      .filter(Boolean)
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0] ?? null;
  const rejectedReason = hours.find((hour: any) => hour.rejectedReason)?.rejectedReason ?? null;
  const directIndividual = record.draftDirectIndividual ?? 0;
  const directGroup = record.draftDirectGroup ?? 0;
  const nonObservingIndividual = record.draftNonObservingIndividual ?? 0;
  const nonObservingGroup = record.draftNonObservingGroup ?? 0;

  const totals = hours.reduce(
    (acc: any, hour: any) => ({
      total: round2(acc.total + hour.value),
      implementing: round2(
        acc.implementing + (hour.type === PracticeLevel.IMPLEMENTING ? hour.value : 0),
      ),
      programming: round2(
        acc.programming + (hour.type === PracticeLevel.PROGRAMMING ? hour.value : 0),
      ),
      legacyPractice: round2(
        acc.legacyPractice +
          ([PracticeLevel.PRACTICE, PracticeLevel.INSTRUCTOR, PracticeLevel.CURATOR].includes(
            hour.type,
          )
            ? hour.value
            : 0),
      ),
      mentor: round2(
        acc.mentor +
          ([PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION].includes(hour.type)
            ? hour.value
            : 0),
      ),
    }),
    { total: 0, implementing: 0, programming: 0, legacyPractice: 0, mentor: 0 },
  );

  return {
    id: record.id,
    source: record.source,
    candidate: record.user,
    createdAt: record.createdAt,
    supervisionDate: record.supervisionDate,
    periodStartedAt: record.periodStartedAt,
    periodEndedAt: record.periodEndedAt,
    treatmentSetting: record.treatmentSetting,
    description: record.description,
    status,
    reviewedAt,
    rejectedReason,
    actionHourId: actionHour?.id ?? null,
    hours,
    totals,
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

export async function getReviewerRequestsHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const query = (req.query ?? {}) as Query;
  const kind = normalizeKind(query.kind);
  const status = normalizeStatus(query.status);
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(500, Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20));
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const nameSort = query.nameSort === 'asc' || query.nameSort === 'desc' ? query.nameSort : null;
  const types = kind === 'mentorship' ? MENTORSHIP_TYPES : SUPERVISION_TYPES;
  const relationKind =
    kind === 'mentorship' ? ReviewerCandidateKind.MENTORSHIP : ReviewerCandidateKind.SUPERVISION;

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    select: { groups: { select: { group: { select: { name: true } } } } },
  });
  if (!reviewer) return reply.code(404).send({ error: 'Проверяющий не найден' });

  const groups = reviewer.groups.map((item) => item.group.name);
  const isExperienced = groups.includes('Опытный Супервизор');
  const canReviewSupervision = groups.includes('Супервизор') || isExperienced;
  if (!canReviewSupervision || (kind === 'mentorship' && !isExperienced)) {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const relations = await prisma.reviewerCandidateRelation.findMany({
    where: {
      reviewerId,
      kind: relationKind,
      status: ReviewerCandidateStatus.ACCEPTED,
      candidate: { archivedAt: null },
    },
    select: {
      candidateId: true,
      cycleId: true,
      candidate: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (relations.length === 0) {
    return reply.send({
      items: [],
      candidates: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,
      permissions: { canReviewSupervision, canReviewMentorship: isExperienced },
    });
  }

  const relationPairs: Prisma.SupervisionRecordWhereInput[] = relations.map((relation) => ({
    userId: relation.candidateId,
    cycleId: relation.cycleId,
  }));
  const candidate = query.candidate?.trim();
  const dateFrom = query.dateFrom ? startOfUtcDay(query.dateFrom) : null;
  const dateTo = query.dateTo ? endOfUtcDay(query.dateTo) : null;
  const dateRange =
    dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        }
      : null;

  const hoursWhere: Prisma.SupervisionHourWhereInput = {
    reviewerId,
    type: { in: types },
    ...(status === 'ALL'
      ? {}
      : status === 'CONFIRMED'
        ? { status: { in: [RecordStatus.CONFIRMED, RecordStatus.SPENT] } }
        : { status }),
  };
  const where: Prisma.SupervisionRecordWhereInput = {
    OR: relationPairs,
    user: {
      archivedAt: null,
      ...(candidate
        ? {
            OR: [
              { fullName: { contains: candidate, mode: 'insensitive' } },
              { fullNameLatin: { contains: candidate, mode: 'insensitive' } },
              { email: { contains: candidate, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    ...(dateRange
      ? {
          OR: [
            { supervisionDate: dateRange },
            { supervisionDate: null, createdAt: dateRange },
          ],
        }
      : {}),
    hours: { some: hoursWhere },
  };

  const [total, records] = await Promise.all([
    prisma.supervisionRecord.count({ where }),
    prisma.supervisionRecord.findMany({
      where,
      select: {
        id: true,
        source: true,
        createdAt: true,
        supervisionDate: true,
        periodStartedAt: true,
        periodEndedAt: true,
        treatmentSetting: true,
        description: true,
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
        user: { select: { id: true, fullName: true, email: true } },
        hours: {
          where: { reviewerId, type: { in: types } },
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
            reviewedAt: true,
            rejectedReason: true,
            reviewer: { select: { id: true, email: true, fullName: true } },
            reviewedBy: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
      orderBy: nameSort
        ? [{ user: { fullName: nameSort } }, { supervisionDate: sortOrder }, { createdAt: sortOrder }]
        : [{ supervisionDate: sortOrder }, { createdAt: sortOrder }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const candidates = Array.from(
    new Map(relations.map((relation) => [relation.candidate.id, relation.candidate])).values(),
  ).sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, 'ru'));

  return reply.send({
    items: records.map(serializeRequest),
    candidates,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    permissions: { canReviewSupervision, canReviewMentorship: isExperienced },
  });
}
