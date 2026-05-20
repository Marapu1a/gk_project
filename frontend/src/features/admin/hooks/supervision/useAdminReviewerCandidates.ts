import { useQuery } from '@tanstack/react-query';
import {
  getAdminReviewerCandidates,
  getAdminReviewerCandidateDetails,
  type AdminReviewerCandidatesParams,
} from '../../api/supervision/getAdminReviewerCandidates';

export function useAdminReviewerCandidates(params: AdminReviewerCandidatesParams) {
  return useQuery({
    queryKey: ['admin', 'supervision', 'reviewerCandidates', params],
    queryFn: () => getAdminReviewerCandidates(params),
    staleTime: 60 * 1000,
  });
}

export function useAdminReviewerCandidateDetails(relationId?: string) {
  return useQuery({
    queryKey: ['admin', 'supervision', 'reviewerCandidateDetails', { relationId }],
    queryFn: () => getAdminReviewerCandidateDetails(relationId as string),
    enabled: !!relationId,
    staleTime: 60 * 1000,
  });
}
