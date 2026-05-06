import { useQuery } from '@tanstack/react-query';
import { getReviewerCandidates } from '../api/getReviewerCandidates';

export function useReviewerCandidates(take = 3) {
  return useQuery({
    queryKey: ['supervision', 'reviewerCandidates', { take }],
    queryFn: () => getReviewerCandidates(take),
    staleTime: 60 * 1000,
  });
}
