// src/features/dashboard-v2/dashboardV2/components/payment-block/PaymentModal.tsx
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import { getPaymentLink } from '@/utils/getPaymentLink';
import type { PaymentItem } from '@/features/payment/api/getUserPayments';
import { useSubmitPaymentMark } from '@/features/payment/hooks/useSubmitPaymentMark';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { getShortPaymentTypeLabel } from '@/utils/labels';

type PaymentModalProps = {
  payment: PaymentItem | null;
  payments: PaymentItem[];
  billingGroup: string;
  targetLevelName?: string;
  onClose: () => void;
};

function getLinkedPayments(
  payment: PaymentItem,
  payments: PaymentItem[],
  targetLevelName?: string,
) {
  const isSupervisorCombined =
    targetLevelName === 'Супервизор' && payment.type === 'DOCUMENT_REVIEW';

  if (!isSupervisorCombined) {
    return [payment];
  }

  const registration = payments.find((p) => p.type === 'REGISTRATION');
  return registration ? [payment, registration] : [payment];
}

export function PaymentModal({
  payment,
  payments,
  billingGroup,
  targetLevelName,
  onClose,
}: PaymentModalProps) {
  const mutation = useSubmitPaymentMark();

  useEffect(() => {
    if (!payment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [payment, onClose]);

  const relatedPayments = useMemo(() => {
    if (!payment) return [];
    return getLinkedPayments(payment, payments, targetLevelName);
  }, [payment, payments, targetLevelName]);

  if (!payment) return null;

  const paymentLink = getPaymentLink(payment.type, billingGroup);
  const title = getShortPaymentTypeLabel(payment.type, { billingGroup, targetLevelName });

  const isPending = relatedPayments.some((p) => p.status === 'PENDING');
  const isPaid = relatedPayments.some((p) => p.status === 'PAID');

  const handleTogglePending = async () => {
    try {
      const result = await mutation.mutateAsync({ payments: relatedPayments });

      toast.success(
        result.nextStatus === 'PENDING'
          ? 'Отметка отправлена на подтверждение'
          : 'Отметка отменена',
      );

      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Не удалось обновить статус оплаты';
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Закрыть модальное окно"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] bg-white p-6 shadow-strong">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="dashboard-v2-page-title text-[#1F305E]">{title}</h3>

            <p className="dashboard-v2-text mt-2 text-[#1F305E]/80">
              Перейдите по ссылке для оплаты. После оплаты нажмите кнопку ниже, чтобы отправить
              отметку администратору.
            </p>
          </div>

          <ModalCloseButton onClick={onClose} iconClassName="h-6 w-6" placement="inline" className="shrink-0" />
        </div>

        <div className="space-y-3">
          {paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-v2-label flex w-full cursor-pointer items-center justify-center rounded-full bg-[#1F305E] px-6 py-4 text-white transition hover:opacity-90"
            >
              Перейти к оплате
            </a>
          ) : (
            <div className="dashboard-v2-text rounded-[18px] border border-[rgba(31,48,94,0.14)] px-4 py-3 text-[#1F305E]/70">
              Ссылка на оплату для этой позиции не найдена.
            </div>
          )}

          {!isPaid && (
            <button
              type="button"
              onClick={handleTogglePending}
              disabled={mutation.isPending}
              className="dashboard-v2-label w-full cursor-pointer rounded-full border border-[#1F305E] px-6 py-4 text-[#1F305E] transition hover:bg-[rgba(31,48,94,0.05)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Отменить отметку' : 'Я оплатил(а)'}
            </button>
          )}

          {isPending && (
            <div className="dashboard-v2-text rounded-[18px] bg-[rgba(31,48,94,0.06)] px-4 py-3 text-[#1F305E]/80">
              Отметка уже отправлена. После проверки администратором статус обновится.
            </div>
          )}

          {isPaid && (
            <div className="dashboard-v2-text rounded-[18px] bg-[var(--color-blue-soft)] px-4 py-3 text-[#1F305E]">
              Эта оплата уже подтверждена.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
