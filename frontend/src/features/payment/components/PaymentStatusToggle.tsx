import { useUpdatePaymentStatus } from '../hooks/useUpdatePaymentStatus';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentItem } from '../api/getUserPayments';

const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;

type Props = {
  payment: PaymentItem;
  isAdmin: boolean;
};

export function PaymentStatusToggle({ payment, isAdmin }: Props) {
  const mutation = useUpdatePaymentStatus();
  const queryClient = useQueryClient();

  const queryKey = isAdmin ? ['payments', payment.userId] : ['payments', 'user'];

  const handleClick = async () => {
    const nextStatus = isAdmin
      ? payment.status === PAYMENT_STATUS.PAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.PAID
      : payment.status === PAYMENT_STATUS.UNPAID
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.UNPAID;

    try {
      await mutation.mutateAsync({ id: payment.id, status: nextStatus });
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
