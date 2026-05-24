import { useQuery } from '@tanstack/react-query';
import {
  getAdminReviewerCandidates,
  type AdminReviewerCandidatesParams,
} from '../../api/supervision/getAdminReviewerCandidates';

export function useAdminReviewerCandidates(params: AdminReviewerCandidatesParams) {
  return useQuery({
    queryKey: ['admin', 'supervision', 'reviewerCandidates', params],
    queryFn: () => getAdminReviewerCandidates(params),
    staleTime: 60 * 1000,
  });
}
