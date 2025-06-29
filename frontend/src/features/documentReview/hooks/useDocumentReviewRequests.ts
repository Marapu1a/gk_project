import { useQuery } from '@tanstack/react-query';
import { getAllDocumentReviewRequests } from '../api/getAllDocumentReviewRequests';

export function useDocumentReviewRequests() {
  return useQuery({
    queryKey: ['documentReviewRequests'],
    queryFn: getAllDocumentReviewRequests,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
