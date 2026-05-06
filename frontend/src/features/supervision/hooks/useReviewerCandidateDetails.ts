import { useQuery } from '@tanstack/react-query';
import {
  getReviewerCandidateDetails,
  type ReviewerCandidateKind,
} from '../api/getReviewerCandidateDetails';

export function useReviewerCandidateDetails(userId?: string, kind: ReviewerCandidateKind = 'supervision') {
  return useQuery({
    queryKey: ['supervision', 'reviewerCandidateDetails', { userId, kind }],
    queryFn: () => getReviewerCandidateDetails(userId as string, kind),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
