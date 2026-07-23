import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import {
  CycleStatus,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
  SupervisionAdminCorrectionKind,
  SupervisionRecordSource,
} from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { buildUserIdentitySearchWhere } from '../../../utils/userIdentitySearch';

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
  | 'REJECTED_BY_REVIEWER'
  | 'ADMIN_CORRECTION'
  | 'LEGACY_RECORD';

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
const LEGACY_SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
];
const LEGACY_MENTORSHIP_TYPES = [PracticeLevel.SUPERVISION];
const HOUR_STATES = new Set<string>([
  'ALL',
  'NEEDS_REVIEW',
  'NO_NEW_HOURS',
  'CONFIRMED_BY_ADMIN',
  'REJECTED_BY_ADMIN',
  'CONFIRMED_BY_REVIEWER',
  'REJECTED_BY_REVIEWER',
  'ADMIN_CORRECTION',
  'LEGACY_RECORD',
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
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEndExclusive(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + 1);
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

function legacyTypesForKind(kind: CandidateKind) {
  return kind === 'mentorship' ? LEGACY_MENTORSHIP_TYPES : LEGACY_SUPERVISION_TYPES;
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
    ADMIN_CORRECTION: 3,
    LEGACY_RECORD: 3,
    CONFIRMED_BY_ADMIN: 3,
    CONFIRMED_BY_REVIEWER: 4,
    NO_NEW_HOURS: 5,
  };

  return ranks[state];
}

function rowTimestamp(row: { latestPendingRequestAt: Date | null; latestRequestAt: Date | null; relationCreatedAt: Date }) {
  return row.latestPendingRequestAt ?? row.latestRequestAt ?? row.relationCreatedAt;
}

function requestTimestamp(record: { supervisionDate: Date | null; createdAt: Date }) {
  return record.supervisionDate ?? record.createdAt;
}

function correctionKind(kind: CandidateKind) {
  return kind === 'mentorship'
    ? SupervisionAdminCorrectionKind.MENTORSHIP
    : SupervisionAdminCorrectionKind.PRACTICE;
}

export async function getAdminReviewerCandidatesHandler(
  req: FastifyRequest<GetAdminReviewerCandidatesRoute>,
  reply: FastifyReply,
) {
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
  const candidateSearchWhere = buildUserIdentitySearchWhere(trimmedSearch);
  const reviewerSearchWhere = buildUserIdentitySearchWhere(trimmedReviewerSearch);
  const attentionOnly = attention === true || attention === 'true' || attention === '1';

  const relations = await prisma.reviewerCandidateRelation.findMany({
    where: {
      kind: prismaKind(normalizedKind),
      cycle: { status: CycleStatus.ACTIVE },
      candidate: {
        archivedAt: null,
        ...(candidateSearchWhere ?? {}),
      },
      reviewer: reviewerSearchWhere ?? undefined,
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

  const candidateIds = Array.from(new Set(relations.map((relation) => relation.candidateId)));
  const cycleIds = Array.from(new Set(relations.map((relation) => relation.cycle.id)));
  const reviewerIds = Array.from(new Set(relations.map((relation) => relation.reviewerId)));
  const recordsByRelationKey = new Map<
    string,
    Array<{
      id: string;
      source: SupervisionRecordSource;
      createdAt: Date;
      supervisionDate: Date | null;
      periodStartedAt: Date | null;
      periodEndedAt: Date | null;
      treatmentSetting: string | null;
      description: string | null;
      draftDirectIndividual: number | null;
      draftDirectGroup: number | null;
      draftNonObservingIndividual: number | null;
      draftNonObservingGroup: number | null;
      hours: Array<{
        id: string;
        type: PracticeLevel;
        value: number;
        status: RecordStatus;
        reviewedAt: Date | null;
        rejectedReason: string | null;
        reviewer: { id: string; email: string; fullName: string | null } | null;
        reviewedBy: { id: string; email: string; fullName: string | null } | null;
      }>;
    }>
  >();

  if (relations.length) {
    const records = await prisma.supervisionRecord.findMany({
      where: {
        userId: { in: candidateIds },
        cycleId: { in: cycleIds },
        hours: {
          some: {
            reviewerId: { in: reviewerIds },
            type: { in: typesForKind(normalizedKind) },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        cycleId: true,
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
        hours: {
          where: {
            reviewerId: { in: reviewerIds },
            type: { in: typesForKind(normalizedKind) },
          },
          select: {
            id: true,
            reviewerId: true,
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
      orderBy: [{ supervisionDate: 'desc' }, { createdAt: 'desc' }],
    });

    for (const record of records) {
      const hoursByReviewer = new Map<string, typeof record.hours>();
      for (const hour of record.hours) {
        if (!hour.reviewerId) continue;
        const list = hoursByReviewer.get(hour.reviewerId) ?? [];
        list.push(hour);
        hoursByReviewer.set(hour.reviewerId, list);
      }

      for (const [reviewerId, hours] of hoursByReviewer.entries()) {
        const key = `${record.userId}:${record.cycleId}:${reviewerId}`;
        const list = recordsByRelationKey.get(key) ?? [];
        list.push({
          id: record.id,
          source: record.source,
          createdAt: record.createdAt,
          supervisionDate: record.supervisionDate,
          periodStartedAt: record.periodStartedAt,
          periodEndedAt: record.periodEndedAt,
          treatmentSetting: record.treatmentSetting,
          description: record.description,
          draftDirectIndividual: record.draftDirectIndividual,
          draftDirectGroup: record.draftDirectGroup,
          draftNonObservingIndividual: record.draftNonObservingIndividual,
          draftNonObservingGroup: record.draftNonObservingGroup,
          hours,
        });
        recordsByRelationKey.set(key, list);
      }
    }
  }

  const rows = relations.map((relation: RelationRow) => {
      const records =
        recordsByRelationKey.get(`${relation.candidateId}:${relation.cycle.id}:${relation.reviewerId}`) ??
        [];

      const pendingRecords = records.filter((record) =>
        record.hours.some((hour) => hour.status === RecordStatus.UNCONFIRMED),
      );
      const latestRequestAt = records[0] ? requestTimestamp(records[0]) : relation.createdAt;
      const latestPendingRequestAt = pendingRecords[0] ? requestTimestamp(pendingRecords[0]) : null;
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
        rowType: 'RELATION' as const,
        relationId: relation.id,
        kind: normalizedKind,
        relationStatus: relation.status,
        candidate: relation.candidate,
        reviewer: relation.reviewer,
        latestRequestAt,
        latestPendingRequestAt,
        latestReview,
        hourState: resolvedHourState,
        adminCorrection: null,
        legacyRecord: null,
        pendingRequests: pendingRecords.map((record) => ({
          id: record.id,
          source: record.source,
          createdAt: record.createdAt,
          supervisionDate: record.supervisionDate,
          periodStartedAt: record.periodStartedAt,
          periodEndedAt: record.periodEndedAt,
          treatmentSetting: record.treatmentSetting,
          description: record.description,
          distribution: {
            directIndividual: record.draftDirectIndividual ?? 0,
            directGroup: record.draftDirectGroup ?? 0,
            nonObservingIndividual: record.draftNonObservingIndividual ?? 0,
            nonObservingGroup: record.draftNonObservingGroup ?? 0,
          },
          hours: record.hours
            .filter((hour) => hour.status === RecordStatus.UNCONFIRMED)
            .map((hour) => ({
              id: hour.id,
              type: hour.type,
              value: hour.value,
            })),
        })),
        relationCreatedAt: relation.createdAt,
        relationUpdatedAt: relation.updatedAt,
        pendingCount,
        sortRank: hourStateRank(resolvedHourState),
      };
    });

  const relationRecordIds = Array.from(
    new Set(
      Array.from(recordsByRelationKey.values()).flatMap((records) =>
        records.map((record) => record.id),
      ),
    ),
  );

  const corrections = await prisma.supervisionAdminCorrection.findMany({
    where: {
      kind: correctionKind(normalizedKind),
      cycle: { status: CycleStatus.ACTIVE },
      user: {
        archivedAt: null,
        ...(candidateSearchWhere ?? {}),
      },
      admin: reviewerSearchWhere ?? undefined,
    },
    select: {
      id: true,
      kind: true,
      implementing: true,
      programming: true,
      mentor: true,
      directIndividual: true,
      directGroup: true,
      nonObservingIndividual: true,
      nonObservingGroup: true,
      notifyUser: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, fullName: true } },
      admin: { select: { id: true, email: true, fullName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const correctionRows = corrections.map((correction) => ({
    rowType: 'ADMIN_CORRECTION' as const,
    relationId: `correction:${correction.id}`,
    correctionId: correction.id,
    kind: normalizedKind,
    relationStatus: ReviewerCandidateStatus.ACCEPTED,
    candidate: correction.user,
    reviewer: correction.admin ?? { id: '', email: '—', fullName: null },
    latestRequestAt: correction.updatedAt,
    latestPendingRequestAt: null,
    latestReview: null,
    hourState: 'ADMIN_CORRECTION' as const,
    pendingRequests: [],
    legacyRecord: null,
    adminCorrection: {
      id: correction.id,
      createdAt: correction.createdAt,
      updatedAt: correction.updatedAt,
      admin: correction.admin,
      notifyUser: correction.notifyUser,
      implementing: correction.implementing,
      programming: correction.programming,
      mentor: correction.mentor,
      distribution: {
        directIndividual: correction.directIndividual,
        directGroup: correction.directGroup,
        nonObservingIndividual: correction.nonObservingIndividual,
        nonObservingGroup: correction.nonObservingGroup,
      },
    },
    relationCreatedAt: correction.createdAt,
    relationUpdatedAt: correction.updatedAt,
    pendingCount: 0,
    sortRank: hourStateRank('ADMIN_CORRECTION'),
  }));

  const shouldLoadLegacyRecords =
    trimmedReviewerSearch.length === 0 &&
    (trimmedSearch.length > 0 || hourState === 'LEGACY_RECORD');

  const legacyRecords =
    !shouldLoadLegacyRecords
      ? []
      : await prisma.supervisionRecord.findMany({
          where: {
            ...(relationRecordIds.length > 0
              ? { id: { notIn: relationRecordIds } }
              : {}),
            user: {
              archivedAt: null,
              ...(candidateSearchWhere ?? {}),
            },
            hours: {
              some: {
                type: { in: legacyTypesForKind(normalizedKind) },
              },
            },
          },
          select: {
            id: true,
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
            user: { select: { id: true, email: true, fullName: true } },
            hours: {
              where: {
                type: { in: legacyTypesForKind(normalizedKind) },
              },
              select: {
                id: true,
                type: true,
                value: true,
                status: true,
              },
            },
          },
          orderBy: [{ supervisionDate: 'desc' }, { createdAt: 'desc' }],
        });

  const legacyRows = legacyRecords.map((record) => ({
    rowType: 'LEGACY_RECORD' as const,
    relationId: `legacy:${record.id}`,
    kind: normalizedKind,
    relationStatus: ReviewerCandidateStatus.ACCEPTED,
    candidate: record.user,
    reviewer: { id: '', email: '—', fullName: null },
    latestRequestAt: requestTimestamp(record),
    latestPendingRequestAt: null,
    latestReview: null,
    hourState: 'LEGACY_RECORD' as const,
    pendingRequests: [],
    adminCorrection: null,
    legacyRecord: {
      id: record.id,
      createdAt: record.createdAt,
      supervisionDate: record.supervisionDate,
      periodStartedAt: record.periodStartedAt,
      periodEndedAt: record.periodEndedAt,
      treatmentSetting: record.treatmentSetting,
      description: record.description,
      distribution: {
        directIndividual: record.draftDirectIndividual ?? 0,
        directGroup: record.draftDirectGroup ?? 0,
        nonObservingIndividual: record.draftNonObservingIndividual ?? 0,
        nonObservingGroup: record.draftNonObservingGroup ?? 0,
      },
      hours: record.hours.map((hour) => ({
        id: hour.id,
        type: hour.type,
        value: hour.value,
        status: hour.status,
      })),
    },
    relationCreatedAt: record.createdAt,
    relationUpdatedAt: record.createdAt,
    pendingCount: 0,
    sortRank: hourStateRank('LEGACY_RECORD'),
  }));

  const allRows = [...rows, ...correctionRows, ...legacyRows];

  const filteredRows = allRows.filter((row) => {
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
      pendingRequests: row.pendingRequests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
        supervisionDate: request.supervisionDate?.toISOString() ?? null,
        periodStartedAt: request.periodStartedAt?.toISOString() ?? null,
        periodEndedAt: request.periodEndedAt?.toISOString() ?? null,
      })),
      adminCorrection: row.adminCorrection
        ? {
            ...row.adminCorrection,
            createdAt: row.adminCorrection.createdAt.toISOString(),
            updatedAt: row.adminCorrection.updatedAt.toISOString(),
          }
        : null,
      legacyRecord: row.legacyRecord
        ? {
            ...row.legacyRecord,
            createdAt: row.legacyRecord.createdAt.toISOString(),
            supervisionDate: row.legacyRecord.supervisionDate?.toISOString() ?? null,
            periodStartedAt: row.legacyRecord.periodStartedAt?.toISOString() ?? null,
            periodEndedAt: row.legacyRecord.periodEndedAt?.toISOString() ?? null,
          }
        : null,
      relationCreatedAt: row.relationCreatedAt.toISOString(),
      relationUpdatedAt: row.relationUpdatedAt.toISOString(),
    })),
  });
}
