// src/features/payment/components/PaymentStatusToggle.tsx
import { useUpdatePaymentStatus } from '../hooks/useUpdatePaymentStatus';
import { useQueryClient } from '@tanstack/react-query';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import type { PaymentItem } from '../api/getUserPayments';
import { toast } from 'sonner';

const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;

type Props = {
  payment: PaymentItem & { userEmail?: string; user?: { email?: string } };
  isAdmin: boolean;
};

export function PaymentStatusToggle({ payment, isAdmin }: Props) {
  const mutation = useUpdatePaymentStatus(payment.userId);
  const queryClient = useQueryClient();

  const userEmail = payment.userEmail ?? payment.user?.email ?? '—';
  const adminUserLink = `/admin/users/${payment.userId}`;

  const invalidateAllPayments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['payments', 'user', payment.userId] }),
      queryClient.invalidateQueries({ queryKey: ['payments', payment.userId] }),
      queryClient.invalidateQueries({ queryKey: ['userPayments', payment.userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', payment.userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', payment.userId] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }), // у юзера дашборд часто рядом
    ]);
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const handleClick = async () => {
    const nextStatus = isAdmin
      ? payment.status === PAYMENT_STATUS.PAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.PAID
      : payment.status === PAYMENT_STATUS.UNPAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.UNPAID;

    const question = isAdmin
      ? nextStatus === 'PAID'
        ? `Подтвердить оплату для ${userEmail}?`
        : `Снять оплату на перепроверку для ${userEmail}?`
      : nextStatus === 'PENDING'
        ? 'Отправить отметку «Я оплатил(а)»? Администраторам придёт уведомление.'
        : 'Отменить вашу отметку об оплате?';

    if (!(await confirmToast(question))) return;

    try {
      await mutation.mutateAsync({ id: payment.id, status: nextStatus });

      if (isAdmin) {
        const msg =
          nextStatus === 'PAID'
            ? `Оплата для ${userEmail} подтверждена`
            : `Оплата снята на перепроверку администратором`;

        try {
          await postNotification({
            userId: payment.userId,
            type: 'PAYMENT',
            message: msg,
            link: '/dashboard',
          });
        } catch {
          toast.info('Статус обновлён, но уведомление пользователю не доставлено.');
        }

        toast.success(msg);
      } else {
        const moderators = await getModerators();
        const admins = (moderators as any[])
          .filter((m) => String(m?.role).toUpperCase() === 'ADMIN')
          .filter((m, i, a) => a.findIndex((x) => x?.id === m?.id) === i)
          .filter((m) => m?.id !== payment.userId);

        const msg =
          nextStatus === 'PENDING'
            ? `Новая отметка об оплате от ${userEmail}`
            : `Пользователь ${userEmail} отменил отметку об оплате`;

        const results = await Promise.allSettled(
          admins.map((m) =>
            postNotification({
              userId: m.id,
              type: 'PAYMENT',
              message: msg,
              link: adminUserLink,
            }),
          ),
        );

        if (results.some((r) => r.status === 'rejected')) {
          toast.info('Статус обновлён, но часть уведомлений админам не ушла.');
        }

        toast.success(
          nextStatus === 'PENDING' ? 'Отметка отправлена на подтверждение' : 'Отметка отменена',
        );
      }

      await invalidateAllPayments();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Ошибка обновления статуса оплаты';
      toast.error(message);
    }
  };

  const showForUser =
    !isAdmin &&
    (payment.status === PAYMENT_STATUS.UNPAID || payment.status === PAYMENT_STATUS.PENDING);

  const showForAdmin =
    isAdmin &&
    (payment.status === PAYMENT_STATUS.PENDING || payment.status === PAYMENT_STATUS.PAID);

  if (!showForUser && !showForAdmin) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-brand"
      disabled={mutation.isPending}
    >
      {isAdmin
        ? payment.status === PAYMENT_STATUS.PAID
          ? 'Снять оплату'
          : 'Подтвердить оплату'
        : payment.status === PAYMENT_STATUS.UNPAID
          ? 'Я оплатил(а)'
          : 'Отменить'}
    </button>
  );
}
