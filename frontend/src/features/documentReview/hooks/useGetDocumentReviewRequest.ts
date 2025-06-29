import { useQuery } from '@tanstack/react-query';
import { getDocumentReviewRequest } from '../api/getDocumentReviewRequest';

export function useGetDocumentReviewRequest() {
  return useQuery({
    queryKey: ['documentReviewRequest'],
    queryFn: getDocumentReviewRequest,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
