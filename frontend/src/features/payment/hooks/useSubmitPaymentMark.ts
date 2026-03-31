// src/features/payment/hooks/useSubmitPaymentMark.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import type { PaymentItem } from '../api/getUserPayments';
import { updatePaymentStatus } from '../api/updatePaymentStatus';
import { userPaymentsQueryKey } from './useUserPayments';
import { userPaymentsByIdQueryKey } from './useUserPaymentsById';

type SubmitPaymentMarkInput = {
  payment: PaymentItem;
};

export function useSubmitPaymentMark() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ payment }: SubmitPaymentMarkInput) => {
      const nextStatus = payment.status === 'PENDING' ? 'UNPAID' : 'PENDING';

      await updatePaymentStatus(payment.id, nextStatus);

      const userEmail = payment.user?.email ?? 'Пользователь';
      const adminUserLink = `/admin/users/${payment.userId}`;

      const moderators = await getModerators();
      const admins = (moderators as any[])
        .filter((m) => String(m?.role).toUpperCase() === 'ADMIN')
        .filter((m, i, arr) => arr.findIndex((x) => x?.id === m?.id) === i)
        .filter((m) => m?.id !== payment.userId);

      const message =
        nextStatus === 'PENDING'
          ? `Новая отметка об оплате от ${userEmail}`
          : `Пользователь ${userEmail} отменил отметку об оплате`;

      const results = await Promise.allSettled(
        admins.map((admin) =>
          postNotification({
            userId: admin.id,
            type: 'PAYMENT',
            message,
            link: adminUserLink,
          }),
        ),
      );

      return {
        nextStatus,
        hasNotificationErrors: results.some((r) => r.status === 'rejected'),
        userId: payment.userId,
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
