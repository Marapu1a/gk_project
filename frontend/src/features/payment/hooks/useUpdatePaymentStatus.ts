import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePaymentStatus } from '../api/updatePaymentStatus';
import type { PaymentStatus } from '../api/getUserPayments';
import { invalidatePaymentQueries } from '../model/paymentQueryInvalidation';

type UpdatePaymentStatusInput = {
  id: string;
  status: PaymentStatus;
  comment?: string;
  notify?: boolean;
};

export function useUpdatePaymentStatus(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, comment, notify }: UpdatePaymentStatusInput) =>
      updatePaymentStatus(id, status, comment, notify),
    onSuccess: () => invalidatePaymentQueries(qc, userId),
  });
}
