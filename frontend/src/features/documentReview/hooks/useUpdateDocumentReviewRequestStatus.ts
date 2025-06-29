import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDocumentReviewRequestStatus } from '../api/updateDocumentReviewRequestStatus';

export function useUpdateDocumentReviewRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentReviewRequestStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentReviewRequests'] });
    },
  });
}
