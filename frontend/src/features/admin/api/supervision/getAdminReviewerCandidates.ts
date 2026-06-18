import { api } from '@/lib/axios';

export type AdminReviewerCandidateKind = 'supervision' | 'mentorship';
export type AdminReviewerCandidateStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type AdminReviewerHourStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type AdminReviewerHourState =
  | 'NEEDS_REVIEW'
  | 'NO_NEW_HOURS'
  | 'CONFIRMED_BY_ADMIN'
  | 'REJECTED_BY_ADMIN'
  | 'CONFIRMED_BY_REVIEWER'
  | 'REJECTED_BY_REVIEWER'
  | 'ADMIN_CORRECTION';
export type AdminReviewerCandidateSortBy =
  | 'candidate'
  | 'candidateEmail'
  | 'reviewerEmail'
  | 'createdAt'
  | 'status';
export type AdminReviewerCandidateSortDir = 'asc' | 'desc';

export type AdminReviewerCandidatesParams = {
  kind?: AdminReviewerCandidateKind;
  createdFrom?: string;
  createdTo?: string;
  search?: string;
  reviewerSearch?: string;
  hourState?: AdminReviewerHourState | 'ALL';
  attention?: boolean;
  sortBy?: AdminReviewerCandidateSortBy;
  sortDir?: AdminReviewerCandidateSortDir;
  page?: number;
  perPage?: number;
};

export type AdminReviewerCandidateRow = {
  rowType: 'RELATION' | 'ADMIN_CORRECTION';
  relationId: string;
  correctionId?: string;
  kind: AdminReviewerCandidateKind;
  relationStatus: AdminReviewerCandidateStatus;
  candidate: { id: string; email: string; fullName: string | null };
  reviewer: { id: string; email: string; fullName: string | null };
  latestRequestAt: string | null;
  latestPendingRequestAt: string | null;
  hourState: AdminReviewerHourState;
  latestReview: {
    status: AdminReviewerHourStatus;
    reviewedAt: string | null;
    rejectedReason: string | null;
    reviewer: { id: string; email: string; fullName: string | null } | null;
    reviewedBy: { id: string; email: string; fullName: string | null } | null;
    reviewedByAdmin: boolean;
  } | null;
  adminCorrection: {
    id: string;
    createdAt: string;
    updatedAt: string;
    admin: { id: string; email: string; fullName: string | null } | null;
    notifyUser: boolean;
    implementing: number;
    programming: number;
    mentor: number;
    distribution: {
      directIndividual: number;
      directGroup: number;
      nonObservingIndividual: number;
      nonObservingGroup: number;
    };
  } | null;
  pendingRequests: Array<{
    id: string;
    createdAt: string;
    periodStartedAt: string | null;
    periodEndedAt: string | null;
    treatmentSetting: string | null;
    description: string | null;
    distribution: {
      directIndividual: number;
      directGroup: number;
      nonObservingIndividual: number;
      nonObservingGroup: number;
    };
    hours: Array<{
      id: string;
      type: string;
      value: number;
    }>;
  }>;
  relationCreatedAt: string;
  relationUpdatedAt: string;
  pendingCount: number;
  sortRank: number;
};

export type AdminReviewerCandidatesResponse = {
  total: number;
  page: number;
  perPage: number;
  rows: AdminReviewerCandidateRow[];
};

export async function getAdminReviewerCandidates(
  params: AdminReviewerCandidatesParams,
): Promise<AdminReviewerCandidatesResponse> {
  const { data } = await api.get<AdminReviewerCandidatesResponse>(
    '/admin/supervision/reviewer-candidates',
    { params },
  );
  return data;
}
