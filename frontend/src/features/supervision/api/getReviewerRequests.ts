import { api } from '@/lib/axios';
import type {
  ReviewerCandidateKind,
  ReviewerCandidateRequest,
} from './getReviewerCandidateDetails';

export type ReviewerRequestStatus = 'ALL' | 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';

export type ReviewerRequestListItem = ReviewerCandidateRequest & {
  candidate: { id: string; fullName: string | null; email: string };
};

export type ReviewerRequestsParams = {
  kind: ReviewerCandidateKind;
  status?: ReviewerRequestStatus;
  candidate?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type ReviewerRequestsResponse = {
  items: ReviewerRequestListItem[];
  candidates: Array<{ id: string; fullName: string | null; email: string }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  permissions: { canReviewSupervision: boolean; canReviewMentorship: boolean };
};

export async function getReviewerRequests(
  params: ReviewerRequestsParams,
): Promise<ReviewerRequestsResponse> {
  const { data } = await api.get<ReviewerRequestsResponse>('/supervision/reviewer/requests', {
    params,
  });
  return data;
}
