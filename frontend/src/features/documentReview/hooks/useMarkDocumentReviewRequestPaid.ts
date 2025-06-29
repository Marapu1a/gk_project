import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markDocumentReviewRequestPaid } from '../api/markDocumentReviewRequestPaid';

export function useMarkDocumentReviewRequestPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markDocumentReviewRequestPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentReviewRequests'] });
    },
  });
}
