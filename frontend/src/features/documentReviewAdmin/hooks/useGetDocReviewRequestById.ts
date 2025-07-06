import { useQuery } from '@tanstack/react-query';
import { getDocReviewRequestById } from '../api/getDocReviewRequestById';

export function useGetDocReviewRequestById(id?: string) {
  return useQuery({
    queryKey: ['admin', 'docReviewRequest', id],
    queryFn: () => getDocReviewRequestById(id),
    enabled: !!id,
  });
}
