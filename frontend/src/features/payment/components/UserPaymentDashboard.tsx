// src/features/payment/components/UserPaymentDashboard.tsx
import { useEffect, useState } from 'react';
import { useUserPayments } from '../hooks/useUserPayments';
import { PaymentStatusToggle } from '../components/PaymentStatusToggle';
import { getPaymentLink } from '@/utils/getPaymentLink';
import type { PaymentItem } from '../api/getUserPayments';
import { targetLevelLabels } from '@/utils/labels';

const LABELS: Record<Exclude<PaymentItem['type'], 'RENEWAL'>, string> = {
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
  'REGISTRATION',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
  'FULL_PACKAGE',
  'RENEWAL',
];

type Props = {
  activeGroupName: string;
  targetLevel: PaymentItem['targetLevel'] | null;
  cycleType?: 'CERTIFICATION' | 'RENEWAL' | null;
  openDefault?: boolean;
};

const BILLING_GROUP_BY_TARGET: Record<'Инструктор' | 'Куратор' | 'Супервизор', string> = {
  Инструктор: 'соискатель',
  Куратор: 'инструктор',
  Супервизор: 'куратор',
};

function getPaymentLabel(payment: PaymentItem): string {
  if (payment.type === 'RENEWAL') {
    const levelLabel = payment.targetLevel
      ? targetLevelLabels[payment.targetLevel] || payment.targetLevel
      : null;

    return levelLabel ? `Ресертификация — ${levelLabel}` : 'Ресертификация';
  }

  return LABELS[payment.type];
}

export function UserPaymentDashboard({
  activeGroupName,
  targetLevel,
  cycleType = null,
  openDefault = false,
}: Props) {
  const { data: payments, isLoading } = useUserPayments();
  const [open, setOpen] = useState(openDefault);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    const onHighlight = () => setHighlight(true);
    window.addEventListener('highlight-payments', onHighlight);
    return () => window.removeEventListener('highlight-payments', onHighlight);
  }, []);

  if (isLoading || !payments) return null;

  const targetLevelName = targetLevel ? targetLevelLabels[targetLevel] : undefined;

  const billingGroup =
    (targetLevelName &&
      BILLING_GROUP_BY_TARGET[targetLevelName as keyof typeof BILLING_GROUP_BY_TARGET]) ||
    (activeGroupName ? activeGroupName.toLowerCase().trim() : '');

  let ordered: PaymentItem[] = [];

  if (cycleType === 'RENEWAL') {
    const renewal = payments.find((p) => p.type === 'RENEWAL' && p.targetLevel === targetLevel);

    ordered = renewal ? [renewal] : [];
  } else {
    const isSupervisor =
      activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';

    const types = isSupervisor
      ? ORDERED_TYPES.filter((t) => t !== 'EXAM_ACCESS' && t !== 'RENEWAL')
      : ORDERED_TYPES.filter((t) => t !== 'RENEWAL');

    ordered = types
      .map((type) => payments.find((p) => p.type === type))
      .filter(Boolean) as PaymentItem[];
  }

  if (!ordered.length) return null;

  return (
    <section
      id="payments"
      className="w-full rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setHighlight(false);
        }}
        aria-expanded={open}
        aria-controls="payments-body"
        className={`w-full flex items-center justify-between px-6 py-4 border-b text-left ${
          highlight ? 'animate-pulse ring-2 ring-offset-2 ring-lime-400' : ''
        }`}
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-bold text-blue-dark">
          Мои оплаты{' '}
          {cycleType === 'RENEWAL' ? (
            <span className="text-sm text-gray-600">
              (ресертификация: <strong>{targetLevelName ?? '—'}</strong>)
            </span>
          ) : targetLevelName ? (
            <span className="text-sm text-gray-600">
              (оплата за уровень: <strong>{targetLevelName}</strong>)
            </span>
          ) : activeGroupName ? (
            <span className="text-sm text-gray-600">
              (по текущему уровню: <strong>{activeGroupName}</strong>)
            </span>
          ) : null}
        </h2>
        <span className="text-sm">{open ? '▲' : '▼'}</span>
      </button>

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
              const link = getPaymentLink(payment.type, billingGroup);

              return (
                <div
                  key={payment.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 ${
                    idx === 0 ? '' : 'border-t'
                  }`}
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold">{getPaymentLabel(payment)}</div>

                    <div className="text-sm text-gray-600">
                      Статус: <span className="font-medium">{STATUS_LABELS[payment.status]}</span>
                    </div>

                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand hover:underline"
                      >
                        Перейти к оплате
                      </a>
                    ) : payment.type === 'RENEWAL' ? (
                      <span className="text-sm text-gray-500">Ссылка на оплату скоро появится</span>
                    ) : null}
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
