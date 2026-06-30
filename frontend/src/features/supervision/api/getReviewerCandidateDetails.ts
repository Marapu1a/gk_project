import { api } from '@/lib/axios';

export type ReviewerCandidateKind = 'supervision' | 'mentorship';
export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
export type PracticeLevel =
  | 'INSTRUCTOR'
  | 'CURATOR'
  | 'SUPERVISOR'
  | 'PRACTICE'
  | 'SUPERVISION'
  | 'IMPLEMENTING'
  | 'PROGRAMMING';

export type ReviewerCandidateRequest = {
  id: string;
  createdAt: string;
  supervisionDate: string | null;
  periodStartedAt: string | null;
  periodEndedAt: string | null;
  treatmentSetting: string | null;
  description: string | null;
  status: RecordStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
  actionHourId: string | null;
  hours: Array<{
    id: string;
    type: PracticeLevel;
    value: number;
    status: RecordStatus;
    reviewedAt: string | null;
    rejectedReason: string | null;
    reviewer: { id: string; email: string; fullName: string | null } | null;
    reviewedBy: { id: string; email: string; fullName: string | null } | null;
  }>;
  totals: {
    total: number;
    implementing: number;
    programming: number;
    legacyPractice: number;
    mentor: number;
  };
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
    direct: number;
    nonObserving: number;
  };
};

export type ReviewerCandidateDetailsResponse = {
  candidate: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    targetLevel: TargetLevel | null;
    primaryGroup: { id: string; name: string; rank: number } | null;
    groups: Array<{ id: string; name: string; rank: number }>;
  };
  activeCycle: {
    id: string;
    type: 'CERTIFICATION' | 'RENEWAL';
    targetLevel: TargetLevel;
    startedAt: string;
  };
  permissions: {
    canReviewSupervision: boolean;
    canReviewMentorship: boolean;
    requestedKind: ReviewerCandidateKind;
  };
  documentReview: {
    status: RecordStatus | 'PARTIALLY_CONFIRMED' | null;
    ready: boolean;
  };
  ceuSummary: {
    required: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
      total: number;
    } | null;
    percent: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
      total: number;
    } | null;
    usable: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
      total: number;
    };
    spent: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
      total: number;
    };
    total: {
      ethics: number;
      cultDiver: number;
      supervision: number;
      general: number;
      total: number;
    };
  };
  supervisionSummary: {
    required: {
      practice: number;
      supervision: number;
      supervisor: number;
    } | null;
    practiceConfirmed: number;
    practicePending: number;
    supervisionConfirmed: number;
    supervisionPending: number;
    practiceBreakdown: {
      total: number;
      legacy: number;
      implementing: number;
      programming: number;
      bonus: number;
    };
    supervisionBreakdown: {
      total: number;
      direct: number;
      nonObserving: number;
      directIndividual: number;
      directGroup: number;
      nonObservingIndividual: number;
      nonObservingGroup: number;
      distributedTotal: number;
      remaining: number;
    };
    mentor: {
      total: number;
      required: number;
      percent: number;
      pending: number;
    } | null;
  };
  requests: {
    supervision: ReviewerCandidateRequest[];
    mentorship: ReviewerCandidateRequest[];
  };
};

export async function getReviewerCandidateDetails(
  userId: string,
  kind: ReviewerCandidateKind,
): Promise<ReviewerCandidateDetailsResponse> {
  const { data } = await api.get<ReviewerCandidateDetailsResponse>(
    `/supervision/reviewer/candidates/${userId}`,
    { params: { kind } },
  );
  return data;
}
