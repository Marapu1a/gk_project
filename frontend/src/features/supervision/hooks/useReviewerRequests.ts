import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getReviewerRequests,
  type ReviewerRequestsParams,
} from '../api/getReviewerRequests';

export function useReviewerRequests(params: ReviewerRequestsParams, enabled = true) {
  return useQuery({
    queryKey: ['supervision', 'reviewerRequests', params],
    queryFn: () => getReviewerRequests(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
