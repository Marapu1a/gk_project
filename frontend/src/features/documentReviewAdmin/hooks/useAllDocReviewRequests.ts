import { useQuery } from '@tanstack/react-query';
import { getAllDocReviewRequests } from '../api/getAllDocReviewRequests';

export function useAllDocReviewRequests(email?: string) {
  return useQuery({
    queryKey: ['admin', 'docReviewRequests', email],
    queryFn: () => getAllDocReviewRequests(email),
  });
}
