import {
  PracticeLevel,
  Prisma,
  RecordStatus,
  ReviewerCandidateKind,
  ReviewerCandidateStatus,
} from '@prisma/client';

const SUPERVISION_TYPES = [
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];
const MENTORSHIP_TYPES = [PracticeLevel.SUPERVISOR, PracticeLevel.SUPERVISION];

export type OpenCooperation = {
  id: string;
  reviewerId: string;
  candidateId: string;
  cycleId: string;
  kind: ReviewerCandidateKind;
};

export async function finishCooperation(
  tx: Prisma.TransactionClient,
  relation: OpenCooperation,
  options: { endedById: string | null; reason: 'MANUAL' | 'CERTIFICATE_ISSUED'; endedAt: Date },
) {
  const closed = await tx.reviewerCandidateRelation.updateMany({
    where: { id: relation.id, status: { in: [ReviewerCandidateStatus.PENDING, ReviewerCandidateStatus.ACCEPTED] } },
    data: {
      status: ReviewerCandidateStatus.ENDED,
      endedAt: options.endedAt,
      endedById: options.endedById,
      endReason: options.reason,
    },
  });
  if (closed.count !== 1) return null;

  const cancelled = await tx.supervisionHour.updateMany({
    where: {
      reviewerId: relation.reviewerId,
      type: { in: relation.kind === ReviewerCandidateKind.MENTORSHIP ? MENTORSHIP_TYPES : SUPERVISION_TYPES },
      status: RecordStatus.UNCONFIRMED,
      record: { userId: relation.candidateId, cycleId: relation.cycleId },
    },
    data: {
      status: RecordStatus.REJECTED,
      rejectedReason: 'Заявка отменена: сотрудничество завершено.',
      reviewedAt: options.endedAt,
    },
  });

  return { cancelledHours: cancelled.count };
}
