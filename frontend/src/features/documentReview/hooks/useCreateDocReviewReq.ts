import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDocReviewReq } from '../api/createDocReviewReq';

export function useCreateDocReviewReq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocReviewReq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docReviewReq'] });
    },
  });
}
