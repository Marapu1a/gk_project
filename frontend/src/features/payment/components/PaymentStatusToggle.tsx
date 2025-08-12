import { useUpdatePaymentStatus } from '../hooks/useUpdatePaymentStatus';
import { useQueryClient } from '@tanstack/react-query';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import type { PaymentItem } from '../api/getUserPayments';

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

  const queryKey = isAdmin ? ['payments', payment.userId] : ['payments', 'user'];
  const userEmail = payment.userEmail ?? payment.user?.email ?? '—';
  const adminUserLink = `/admin/users/${payment.userId}`;

  const handleClick = async () => {
    const nextStatus = isAdmin
      ? payment.status === PAYMENT_STATUS.PAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.PAID
      : payment.status === PAYMENT_STATUS.UNPAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.UNPAID;

    // ✅ Подтверждение для юзера (чтобы не спамил уведомлениями)
    if (!isAdmin) {
      const question =
        nextStatus === 'PENDING'
          ? 'Отправить отметку «Я оплатил»? Админам придёт уведомление.'
          : 'Отменить вашу отметку об оплате?';
      if (!window.confirm(question)) return;
    }

    try {
      await mutation.mutateAsync({ id: payment.id, status: nextStatus });

      if (isAdmin) {
        // Админ меняет статус — уведомляем пользователя, указываем его email
        const msg =
          nextStatus === 'PAID'
            ? `Оплата подтверждена (${userEmail})`
            : `Оплата снята на перепроверку (${userEmail})`;
        await postNotification({
          userId: payment.userId,
          type: 'PAYMENT',
          message: msg,
          link: '/dashboard',
        });
      } else {
        // Пользователь меняет статус — уведомляем модераторов, линк на страницу пользователя
        const moderators = await getModerators();
        const msg =
          nextStatus === 'PENDING'
            ? `Новая отметка об оплате от ${userEmail}`
            : `Пользователь ${userEmail} отменил отметку об оплате`;
        await Promise.all(
          moderators.map((m) =>
            postNotification({
              userId: m.id,
              type: 'PAYMENT',
              message: msg,
              link: adminUserLink,
            }),
          ),
        );
      }

      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error('Ошибка при обновлении статуса оплаты:', err);
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
          ? 'Я оплатил'
          : 'Отменить'}
    </button>
  );
}
