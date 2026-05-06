import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CycleStatus,
  PracticeLevel,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';

type CandidateKind = 'supervision' | 'mentorship';

type Query = {
  take?: string;
};

type CandidateRelation = {
  id: string;
  status: ReviewerCandidateStatus;
  createdAt: Date;
  updatedAt: Date;
  candidate: {
    id: string;
    fullName: string | null;
    email: string;
  };
  cycle: {
    id: string;
  };
};

type CandidateAggregate = {
  relationId: string;
  userId: string;
  fullName: string | null;
  email: string;
  latestRequestAt: Date | null;
  latestPendingRequestAt: Date | null;
  pendingCount: number;
  status: ReviewerCandidateStatus;
  sortRank: number;
};

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];

function prismaKind(kind: CandidateKind) {
  return kind === 'mentorship'
    ? ReviewerCandidateKind.MENTORSHIP
    : ReviewerCandidateKind.SUPERVISION;
}

function typesForKind(kind: CandidateKind) {
  return kind === 'mentorship' ? MENTORSHIP_TYPES : SUPERVISION_TYPES;
}

function statusRank(status: ReviewerCandidateStatus, pendingCount: number) {
  if (status === ReviewerCandidateStatus.PENDING) return 0;
  if (status === ReviewerCandidateStatus.ACCEPTED && pendingCount > 0) return 1;
  if (status === ReviewerCandidateStatus.ACCEPTED) return 2;
  return 3;
}

function candidateTimestamp(candidate: CandidateAggregate) {
  return (
    candidate.latestPendingRequestAt ??
    candidate.latestRequestAt ??
    new Date(0)
  ).getTime();
}

async function buildCandidates(params: {
  reviewerId: string;
  kind: CandidateKind;
}): Promise<CandidateAggregate[]> {
  const { reviewerId, kind } = params;
  const relations = await prisma.reviewerCandidateRelation.findMany({
    where: {
      reviewerId,
      kind: prismaKind(kind),
      cycle: { status: CycleStatus.ACTIVE },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      candidate: { select: { id: true, fullName: true, email: true } },
      cycle: { select: { id: true } },
    },
  });

  const candidates = await Promise.all(
    relations.map(async (relation: CandidateRelation) => {
      const records = await prisma.supervisionRecord.findMany({
        where: {
          userId: relation.candidate.id,
          cycleId: relation.cycle.id,
          hours: {
            some: {
              reviewerId,
              type: { in: typesForKind(kind) },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          hours: {
            where: { reviewerId, type: { in: typesForKind(kind) } },
            select: { status: true },
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

      return {
        relationId: relation.id,
        userId: relation.candidate.id,
        fullName: relation.candidate.fullName,
        email: relation.candidate.email,
        latestRequestAt,
        latestPendingRequestAt,
        pendingCount,
        status: relation.status,
        sortRank: statusRank(relation.status, pendingCount),
      };
    }),
  );

  return candidates.sort((a, b) => {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    return candidateTimestamp(b) - candidateTimestamp(a);
  });
}

function serializeCandidate(candidate: CandidateAggregate) {
  return {
    ...candidate,
    latestRequestAt: candidate.latestRequestAt?.toISOString() ?? null,
    latestPendingRequestAt: candidate.latestPendingRequestAt?.toISOString() ?? null,
  };
}

export async function getReviewerCandidatesHandler(req: FastifyRequest, reply: FastifyReply) {
  const reviewerId = req.user?.userId;
  const role = req.user?.role;
  if (!reviewerId) return reply.code(401).send({ error: 'Не авторизован' });

  const { take = '3' } = req.query as Query;
  const limit = Math.max(1, Math.min(50, Number.isFinite(+take) ? +take : 3));

  const reviewer = await prisma.user.findUnique({
    where: { id: reviewerId },
    select: {
      groups: { select: { group: { select: { name: true } } } },
    },
  });

  if (!reviewer) return reply.code(404).send({ error: 'Проверяющий не найден' });

  const groupNames = reviewer.groups.map((item) => item.group.name);
  const isAdmin = role === 'ADMIN';
  const isExperiencedSupervisor = groupNames.includes('Опытный Супервизор');
  const isSupervisor = groupNames.includes('Супервизор') || isExperiencedSupervisor;

  if (!isAdmin && !isSupervisor) {
    return reply.send({
      supervision: [],
      mentorship: [],
      totals: { supervision: 0, mentorship: 0 },
      canReviewSupervision: false,
      canReviewMentorship: false,
    });
  }

  const [supervision, mentorship] = await Promise.all([
    buildCandidates({ reviewerId, kind: 'supervision' }),
    isAdmin || isExperiencedSupervisor
      ? buildCandidates({ reviewerId, kind: 'mentorship' })
      : Promise.resolve([]),
  ]);

  return reply.send({
    supervision: supervision.slice(0, limit).map(serializeCandidate),
    mentorship: mentorship.slice(0, limit).map(serializeCandidate),
    totals: {
      supervision: supervision.length,
      mentorship: mentorship.length,
    },
    canReviewSupervision: true,
    canReviewMentorship: isAdmin || isExperiencedSupervisor,
  });
}
