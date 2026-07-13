import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePaymentStatus } from '../api/updatePaymentStatus';
import type { PaymentStatus } from '../api/getUserPayments';
import { userPaymentsQueryKey } from './useUserPayments';
import { userPaymentsByIdQueryKey } from './useUserPaymentsById';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';

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
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: userPaymentsQueryKey }),
        qc.invalidateQueries({ queryKey: userPaymentsByIdQueryKey(userId) }),
        qc.invalidateQueries({ queryKey: currentUserQueryKey }),
        qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) }),
      ]);
    },
  });
}
