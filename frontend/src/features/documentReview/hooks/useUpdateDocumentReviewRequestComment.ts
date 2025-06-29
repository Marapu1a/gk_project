import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDocumentReviewRequestComment } from '../api/updateDocumentReviewRequestComment';

export function useUpdateDocumentReviewRequestComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentReviewRequestComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentReviewRequests'] });
    },
  });
}
