// src/features/payment/components/UserPaymentDashboard.tsx
import { useEffect, useState } from 'react';
import { useUserPayments } from '../hooks/useUserPayments';
import { PaymentStatusToggle } from '../components/PaymentStatusToggle';
import { getPaymentLink } from '@/utils/getPaymentLink';
import type { PaymentItem } from '../api/getUserPayments';

const LABELS: Record<PaymentItem['type'], string> = {
  DOCUMENT_REVIEW: 'Проверка документов',
  EXAM_ACCESS: 'Доступ к экзамену',
  REGISTRATION: 'Регистрация и супервизия',
  FULL_PACKAGE: 'Полный пакет со скидкой',
};

const STATUS_LABELS: Record<PaymentItem['status'], string> = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает подтверждения',
  PAID: 'Оплачено',
};

const ORDERED_TYPES: PaymentItem['type'][] = [
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
  'REGISTRATION',
  'FULL_PACKAGE',
];

type Props = {
  activeGroupName: string;
  openDefault?: boolean; // можно открыть по умолчанию
};

export function UserPaymentDashboard({ activeGroupName, openDefault = false }: Props) {
  const { data: payments, isLoading } = useUserPayments();
  const [open, setOpen] = useState(openDefault);
  const [highlight, setHighlight] = useState(false);

  // ловим внешнее событие для подсветки заголовка
  useEffect(() => {
    const onHighlight = () => setHighlight(true);
    window.addEventListener('highlight-payments', onHighlight);
    return () => window.removeEventListener('highlight-payments', onHighlight);
  }, []);

  if (isLoading || !payments) return null;

  const ordered = ORDERED_TYPES.map((t) => payments.find((p) => p.type === t)).filter(
    Boolean,
  ) as PaymentItem[];

  return (
    <section
      id="payments"
      className="w-full rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Заголовок-аккордеон + подсветка */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setHighlight(false); // клик по заголовку гасит мигание
        }}
        aria-expanded={open}
        aria-controls="payments-body"
        className={`w-full flex items-center justify-between px-6 py-4 border-b text-left
          ${highlight ? 'animate-pulse ring-2 ring-offset-2 ring-lime-400' : ''}`}
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-bold text-blue-dark">
          Мои оплаты {activeGroupName ? `(Текущий уровень: ${activeGroupName})` : ''}
        </h2>
        <span className="text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {/* Плавное раскрытие: 0fr → 1fr */}
      <div
        id="payments-body"
        aria-hidden={!open}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 400ms ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-6 py-5 space-y-4">
            {ordered.map((payment, idx) => {
              const link = getPaymentLink(payment.type, activeGroupName);

              return (
                <div
                  key={payment.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 ${
                    idx === 0 ? '' : 'border-t'
                  }`}
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold">{LABELS[payment.type]}</div>

                    <div className="text-sm text-gray-600">
                      Статус: <span className="font-medium">{STATUS_LABELS[payment.status]}</span>
                    </div>

                    {link !== '#' && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand hover:underline"
                      >
                        Перейти к оплате
                      </a>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-0">
                    <PaymentStatusToggle payment={payment} isAdmin={false} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
