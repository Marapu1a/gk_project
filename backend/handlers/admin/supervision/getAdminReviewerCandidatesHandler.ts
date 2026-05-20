import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import {
  CycleStatus,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
} from '@prisma/client';
import { prisma } from '../../../lib/prisma';

type CandidateKind = 'supervision' | 'mentorship';
type SortBy = 'candidate' | 'candidateEmail' | 'reviewerEmail' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';
type HourState =
  | 'ALL'
  | 'NEEDS_REVIEW'
  | 'NO_NEW_HOURS'
  | 'CONFIRMED_BY_ADMIN'
  | 'REJECTED_BY_ADMIN'
  | 'CONFIRMED_BY_REVIEWER'
  | 'REJECTED_BY_REVIEWER';

interface GetAdminReviewerCandidatesRoute extends RouteGenericInterface {
  Querystring: {
    kind?: CandidateKind;
    createdFrom?: string;
    createdTo?: string;
    search?: string;
    reviewerSearch?: string;
    hourState?: HourState;
    attention?: string | boolean;
    sortBy?: SortBy;
    sortDir?: SortDir;
    page?: string | number;
    perPage?: string | number;
  };
}

type RelationRow = {
  id: string;
  status: ReviewerCandidateStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewerId: string;
  candidateId: string;
  reviewer: { id: string; email: string; fullName: string | null };
  candidate: { id: string; email: string; fullName: string | null };
  cycle: { id: string };
};

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];
const HOUR_STATES = new Set<string>([
  'ALL',
  'NEEDS_REVIEW',
  'NO_NEW_HOURS',
  'CONFIRMED_BY_ADMIN',
  'REJECTED_BY_ADMIN',
  'CONFIRMED_BY_REVIEWER',
  'REJECTED_BY_REVIEWER',
]);
const SORT_FIELDS = new Set<string>([
  'candidate',
  'candidateEmail',
  'reviewerEmail',
  'createdAt',
  'status',
]);

function toInt(value: unknown, fallback: number) {
  const parsed =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateStart(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEndExclusive(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().normalize('NFKC').trim();
}

function compareValues(a: string | number | Date | null, b: string | number | Date | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;

  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right, 'ru');
  }

  return left < right ? -1 : 1;
}

function prismaKind(kind: CandidateKind) {
  return kind === 'mentorship'
    ? ReviewerCandidateKind.MENTORSHIP
    : ReviewerCandidateKind.SUPERVISION;
}

function typesForKind(kind: CandidateKind) {
  return kind === 'mentorship' ? MENTORSHIP_TYPES : SUPERVISION_TYPES;
}

function resolveHourState(params: {
  pendingCount: number;
  latestReview: {
    status: RecordStatus;
    reviewedByAdmin: boolean;
  } | null;
}): Exclude<HourState, 'ALL'> {
  const { pendingCount, latestReview } = params;
  if (pendingCount > 0) return 'NEEDS_REVIEW';
  if (!latestReview) return 'NO_NEW_HOURS';
  if (latestReview.status === RecordStatus.REJECTED) {
    return latestReview.reviewedByAdmin ? 'REJECTED_BY_ADMIN' : 'REJECTED_BY_REVIEWER';
  }
  return latestReview.reviewedByAdmin ? 'CONFIRMED_BY_ADMIN' : 'CONFIRMED_BY_REVIEWER';
}

function hourStateRank(state: Exclude<HourState, 'ALL'>) {
  const ranks: Record<Exclude<HourState, 'ALL'>, number> = {
    NEEDS_REVIEW: 0,
    REJECTED_BY_ADMIN: 1,
    REJECTED_BY_REVIEWER: 2,
    CONFIRMED_BY_ADMIN: 3,
    CONFIRMED_BY_REVIEWER: 4,
    NO_NEW_HOURS: 5,
  };

  return ranks[state];
}

function rowTimestamp(row: { latestPendingRequestAt: Date | null; latestRequestAt: Date | null; relationCreatedAt: Date }) {
  return row.latestPendingRequestAt ?? row.latestRequestAt ?? row.relationCreatedAt;
}

export async function getAdminReviewerCandidatesHandler(
  req: FastifyRequest<GetAdminReviewerCandidatesRoute>,
  reply: FastifyReply,
) {
  if (req.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const {
    kind = 'supervision',
    createdFrom,
    createdTo,
    search = '',
    reviewerSearch = '',
    hourState = 'ALL',
    attention = false,
    sortBy: rawSortBy = 'createdAt',
    sortDir: rawSortDir = 'desc',
  } = req.query;

  const normalizedKind: CandidateKind = kind === 'mentorship' ? 'mentorship' : 'supervision';
  const from = parseDateStart(createdFrom);
  const to = parseDateEndExclusive(createdTo);

  if (from === null) return reply.code(400).send({ error: 'INVALID_CREATED_FROM' });
  if (to === null) return reply.code(400).send({ error: 'INVALID_CREATED_TO' });
  if (!HOUR_STATES.has(hourState)) {
    return reply.code(400).send({ error: 'INVALID_HOUR_STATE' });
  }

  const sortBy: SortBy = SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'createdAt';
  const sortDir: SortDir = rawSortDir === 'asc' ? 'asc' : 'desc';
  const page = toInt(req.query.page, 1);
  const perPage = Math.min(toInt(req.query.perPage, 100), 500);
  const trimmedSearch = search.trim();
  const trimmedReviewerSearch = reviewerSearch.trim();
  const attentionOnly = attention === true || attention === 'true' || attention === '1';

  const relations = await prisma.reviewerCandidateRelation.findMany({
    where: {
      kind: prismaKind(normalizedKind),
      cycle: { status: CycleStatus.ACTIVE },
      candidate: {
        archivedAt: null,
        ...(trimmedSearch
          ? {
              OR: [
                { email: { contains: trimmedSearch, mode: 'insensitive' } },
                { fullName: { contains: trimmedSearch, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      reviewer: trimmedReviewerSearch
        ? {
            OR: [
              { email: { contains: trimmedReviewerSearch, mode: 'insensitive' } },
              { fullName: { contains: trimmedReviewerSearch, mode: 'insensitive' } },
            ],
          }
        : undefined,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      reviewerId: true,
      candidateId: true,
      reviewer: { select: { id: true, email: true, fullName: true } },
      candidate: { select: { id: true, email: true, fullName: true } },
      cycle: { select: { id: true } },
    },
  });

  const rows = await Promise.all(
    relations.map(async (relation: RelationRow) => {
      const records = await prisma.supervisionRecord.findMany({
        where: {
          userId: relation.candidateId,
          cycleId: relation.cycle.id,
          hours: {
            some: {
              reviewerId: relation.reviewerId,
              type: { in: typesForKind(normalizedKind) },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          hours: {
            where: {
              reviewerId: relation.reviewerId,
              type: { in: typesForKind(normalizedKind) },
            },
            select: {
              status: true,
              reviewedAt: true,
              rejectedReason: true,
              reviewer: { select: { id: true, email: true, fullName: true } },
              reviewedBy: { select: { id: true, email: true, fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const pendingRecords = records.filter((record) =>
        record.hours.some((hour) => hour.status === RecordStatus.UNCONFIRMED),
      );
      const latestRequestAt = records[0]?.createdAt ?? relation.createdAt;
      const latestPendingRequestAt = pendingRecords[0]?.createdAt ?? null;
      const pendingCount = pendingRecords.length;
      const latestReviewedHour =
        records
          .flatMap((record) => record.hours)
          .filter((hour) => hour.status !== RecordStatus.UNCONFIRMED && hour.reviewedAt)
          .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))[0] ??
        null;

      const latestReview = latestReviewedHour
        ? {
            status: latestReviewedHour.status,
            reviewedAt: latestReviewedHour.reviewedAt,
            rejectedReason: latestReviewedHour.rejectedReason,
            reviewer: latestReviewedHour.reviewer,
            reviewedBy: latestReviewedHour.reviewedBy,
            reviewedByAdmin:
              !!latestReviewedHour.reviewedBy &&
              latestReviewedHour.reviewedBy.id !== latestReviewedHour.reviewer?.id,
          }
        : null;
      const resolvedHourState = resolveHourState({ pendingCount, latestReview });

      return {
        relationId: relation.id,
        kind: normalizedKind,
        relationStatus: relation.status,
        candidate: relation.candidate,
        reviewer: relation.reviewer,
        latestRequestAt,
        latestPendingRequestAt,
        latestReview,
        hourState: resolvedHourState,
        relationCreatedAt: relation.createdAt,
        relationUpdatedAt: relation.updatedAt,
        pendingCount,
        sortRank: hourStateRank(resolvedHourState),
      };
    }),
  );

  const filteredRows = rows.filter((row) => {
    const date = rowTimestamp(row);
    if (from && date < from) return false;
    if (to && date >= to) return false;
    if (hourState !== 'ALL' && row.hourState !== hourState) return false;
    if (attentionOnly && row.hourState !== 'NEEDS_REVIEW') return false;
    return true;
  });

  filteredRows.sort((a, b) => {
    const direction = sortDir === 'asc' ? 1 : -1;
    const values: Record<SortBy, [string | Date | number | null, string | Date | number | null]> = {
      candidate: [normalize(a.candidate.fullName || a.candidate.email), normalize(b.candidate.fullName || b.candidate.email)],
      candidateEmail: [normalize(a.candidate.email), normalize(b.candidate.email)],
      reviewerEmail: [normalize(a.reviewer.email), normalize(b.reviewer.email)],
      createdAt: [rowTimestamp(a), rowTimestamp(b)],
      status: [a.sortRank, b.sortRank],
    };
    const primary = compareValues(...values[sortBy]);
    if (primary !== 0) return primary * direction;
    return compareValues(rowTimestamp(b), rowTimestamp(a));
  });

  const total = filteredRows.length;
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage);

  return reply.send({
    total,
    page,
    perPage,
    rows: pageRows.map((row) => ({
      ...row,
      latestRequestAt: row.latestRequestAt?.toISOString() ?? null,
      latestPendingRequestAt: row.latestPendingRequestAt?.toISOString() ?? null,
      latestReview: row.latestReview
        ? {
            ...row.latestReview,
            reviewedAt: row.latestReview.reviewedAt?.toISOString() ?? null,
          }
        : null,
      relationCreatedAt: row.relationCreatedAt.toISOString(),
      relationUpdatedAt: row.relationUpdatedAt.toISOString(),
    })),
  });
}
