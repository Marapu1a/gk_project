import { useQuery } from '@tanstack/react-query';
import { getReviewerCandidates } from '../api/getReviewerCandidates';

export function useReviewerCandidates(take = 3, enabled = true) {
  return useQuery({
    queryKey: ['supervision', 'reviewerCandidates', { take }],
    queryFn: () => getReviewerCandidates(take),
    enabled,
    staleTime: 60 * 1000,
  });
}
