import { useQuery } from '@tanstack/react-query';
import { getDocumentReviewRequestsByEmail } from '../api/getDocumentReviewRequestsByEmail';

export function useDocumentReviewRequestsByEmail(email: string, enabled: boolean) {
  return useQuery({
    queryKey: ['documentReviewRequestsByEmail', email],
    queryFn: () => getDocumentReviewRequestsByEmail(email),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
