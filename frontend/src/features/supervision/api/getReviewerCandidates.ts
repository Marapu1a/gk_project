import { api } from '@/lib/axios';

export type ReviewerCandidateStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type ReviewerCandidate = {
  relationId: string;
  userId: string;
  fullName: string | null;
  email: string;
  latestRequestAt: string | null;
  latestPendingRequestAt: string | null;
  pendingCount: number;
  status: ReviewerCandidateStatus;
  sortRank: number;
};

export type ReviewerCandidatesResponse = {
  supervision: ReviewerCandidate[];
  mentorship: ReviewerCandidate[];
  totals: {
    supervision: number;
    mentorship: number;
  };
  canReviewSupervision: boolean;
  canReviewMentorship: boolean;
};

export async function getReviewerCandidates(take = 3): Promise<ReviewerCandidatesResponse> {
  const { data } = await api.get<ReviewerCandidatesResponse>('/supervision/reviewer/candidates', {
    params: { take },
  });
  return data;
}
