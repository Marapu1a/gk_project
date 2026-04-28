// src/features/payment/hooks/useSubmitPaymentMark.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaymentItem } from '../api/getUserPayments';
import { updatePaymentStatus } from '../api/updatePaymentStatus';
import { userPaymentsQueryKey } from './useUserPayments';
import { userPaymentsByIdQueryKey } from './useUserPaymentsById';

type SubmitPaymentMarkInput = {
  payments: PaymentItem[];
};

export function useSubmitPaymentMark() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ payments }: SubmitPaymentMarkInput) => {
      if (!payments.length) {
        throw new Error('Нет платежей для обновления');
      }

      const primaryPayment = payments[0];
      const nextStatus = primaryPayment.status === 'PENDING' ? 'UNPAID' : 'PENDING';

      await Promise.all(
        payments.map((payment, index) =>
          updatePaymentStatus(payment.id, nextStatus, undefined, index === 0),
        ),
      );

      return {
        nextStatus,
        userId: primaryPayment.userId,
      };
    },
    onSuccess: async ({ userId }) => {
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
