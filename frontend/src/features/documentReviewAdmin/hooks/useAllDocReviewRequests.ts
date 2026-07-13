import { useQuery } from '@tanstack/react-query';
import { getAllDocReviewRequests } from '../api/getAllDocReviewRequests';

export function useAllDocReviewRequests(search?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['admin', 'docReviewRequests', search],
    queryFn: () => getAllDocReviewRequests(search),
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}
