import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePaymentStatus } from '../api/updatePaymentStatus';

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: 'UNPAID' | 'PENDING' | 'PAID';
      comment?: string;
    }) => updatePaymentStatus(id, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'user'] });
    },
  });
}
