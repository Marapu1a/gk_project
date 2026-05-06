import { api } from '@/lib/axios';
import type { ReviewerCandidateStatus } from './getReviewerCandidates';

export type UpdateReviewerCandidateRelationInput = {
  id: string;
  status: Extract<ReviewerCandidateStatus, 'ACCEPTED' | 'REJECTED'>;
};

export async function updateReviewerCandidateRelation({
  id,
  status,
}: UpdateReviewerCandidateRelationInput) {
  const { data } = await api.patch(`/supervision/reviewer/candidates/${id}`, { status });
  return data;
}
