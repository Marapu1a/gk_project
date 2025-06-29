import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDocumentReviewRequest } from '../api/createDocumentReviewRequest';

export function useCreateDocumentReviewRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocumentReviewRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentReviewRequest'] });
    },
  });
}
