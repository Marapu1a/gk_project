import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDocReviewRequestPaid } from '../api/updateDocReviewRequestPaid';

export function useUpdateDocReviewRequestPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      updateDocReviewRequestPaid(id, paid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequest', variables.id] });
    },
  });
}
