import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePaymentStatus } from '../api/updatePaymentStatus';
import type { PaymentStatus } from '../api/getUserPayments';
import { userPaymentsQueryKey } from './useUserPayments';
import { userPaymentsByIdQueryKey } from './useUserPaymentsById';

type UpdatePaymentStatusInput = {
  id: string;
  status: PaymentStatus;
  comment?: string;
};

export function useUpdatePaymentStatus(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, comment }: UpdatePaymentStatusInput) =>
      updatePaymentStatus(id, status, comment),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: userPaymentsQueryKey }),
        qc.invalidateQueries({ queryKey: userPaymentsByIdQueryKey(userId) }),
        qc.invalidateQueries({ queryKey: ['me'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
      ]);
    },
  });
}
