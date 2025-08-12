// src/features/payment/hooks/useUpdatePaymentStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePaymentStatus } from '../api/updatePaymentStatus';

export function useUpdatePaymentStatus(userId: string) {
  const qc = useQueryClient();
  const userKey = ['admin', 'user', userId] as const;

  return useMutation({
    mutationFn: ({ id, status, comment }: {
      id: string;
      status: 'UNPAID' | 'PENDING' | 'PAID';
      comment?: string;
    }) => updatePaymentStatus(id, status, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKey });
      // если где-то есть отдельный список платежей
      qc.invalidateQueries({ queryKey: ['payments', 'user', userId] });
    },
  });
}
