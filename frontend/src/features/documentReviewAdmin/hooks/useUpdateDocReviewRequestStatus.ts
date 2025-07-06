import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDocReviewRequestStatus } from '../api/updateDocReviewRequestStatus';

export function useUpdateDocReviewRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED'; comment?: string }) =>
      updateDocReviewRequestStatus(id, status, comment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'docReviewRequest', variables.id] });
    },
  });
}
