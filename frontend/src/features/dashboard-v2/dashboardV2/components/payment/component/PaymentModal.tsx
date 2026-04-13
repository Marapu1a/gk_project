import { useEffect } from 'react';
import { toast } from 'sonner';

import { getPaymentLink } from '@/utils/getPaymentLink';
import type { PaymentItem } from '@/features/payment/api/getUserPayments';
import { useSubmitPaymentMark } from '@/features/payment/hooks/useSubmitPaymentMark';

type PaymentModalProps = {
  payment: PaymentItem | null;
  billingGroup: string;
  onClose: () => void;
};

const TITLE_BY_TYPE: Record<PaymentItem['type'], string> = {
  FULL_PACKAGE: 'Сертификация - пакет со скидкой 10%',
  REGISTRATION: 'Подача заявки на сертификацию и учет часов практики',
  DOCUMENT_REVIEW: 'Экспертиза документов',
  EXAM_ACCESS: 'Экзамен',
  RENEWAL: 'Ресертификация',
};

export function PaymentModal({ payment, billingGroup, onClose }: PaymentModalProps) {
  const mutation = useSubmitPaymentMark();

  useEffect(() => {
    if (!payment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [payment, onClose]);

  if (!payment) return null;

  const paymentLink = getPaymentLink(payment.type, billingGroup);
  const title =
    payment.type === 'DOCUMENT_REVIEW' && billingGroup === 'куратор'
      ? 'Подача заявки на сертификацию, экспертиза документов на уровень Супервизор ПАП'
      : TITLE_BY_TYPE[payment.type];

  const isPending = payment.status === 'PENDING';
  const isPaid = payment.status === 'PAID';

  const handleTogglePending = async () => {
    try {
      const result = await mutation.mutateAsync({ payment });

      if (result.hasNotificationErrors) {
        toast.info('Статус обновлён, но часть уведомлений админам не ушла.');
      }

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

      <div className="relative z-10 w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-strong">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[22px] font-semibold text-[#1F305E]">
              {title}
            </h3>

            <p className="mt-2 text-[15px] leading-6 text-[#1F305E]/80">
              Перейдите по ссылке для оплаты. После оплаты нажмите кнопку ниже, чтобы отправить
              отметку администратору.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(31,48,94,0.14)] text-[#1F305E] transition hover:bg-[rgba(31,48,94,0.05)]"
            aria-label="Закрыть"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-full bg-[#1F305E] px-6 py-4 text-[16px] font-semibold text-white transition hover:opacity-90"
            >
              Перейти к оплате
            </a>
          ) : (
            <div className="rounded-[18px] border border-[rgba(31,48,94,0.14)] px-4 py-3 text-sm text-[#1F305E]/70">
              Ссылка на оплату для этой позиции не найдена.
            </div>
          )}

          {!isPaid && (
            <button
              type="button"
              onClick={handleTogglePending}
              disabled={mutation.isPending}
              className="w-full rounded-full border border-[#1F305E] px-6 py-4 text-[16px] font-semibold text-[#1F305E] transition hover:bg-[rgba(31,48,94,0.05)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Отменить отметку' : 'Я оплатил(а)'}
            </button>
          )}

          {isPending && (
            <div className="rounded-[18px] bg-[rgba(31,48,94,0.06)] px-4 py-3 text-sm text-[#1F305E]/80">
              Отметка уже отправлена. После проверки администратором статус обновится.
            </div>
          )}

          {isPaid && (
            <div className="rounded-[18px] bg-[rgba(165,203,55,0.12)] px-4 py-3 text-sm font-medium text-[#1F305E]">
              Эта оплата уже подтверждена.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
