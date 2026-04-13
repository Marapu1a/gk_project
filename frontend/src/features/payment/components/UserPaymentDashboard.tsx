import { useEffect, useState } from 'react';
import { useUserPayments } from '../hooks/useUserPayments';
import { PaymentStatusToggle } from '../components/PaymentStatusToggle';
import { getPaymentLink } from '@/utils/getPaymentLink';
import type { PaymentItem } from '../api/getUserPayments';
import { targetLevelLabels } from '@/utils/labels';

const LABELS: Record<Exclude<PaymentItem['type'], 'RENEWAL'>, string> = {
  DOCUMENT_REVIEW: 'Экспертиза документов',
  EXAM_ACCESS: 'Экзамен',
  REGISTRATION: 'Подача заявки на сертификацию и учет часов практики',
  FULL_PACKAGE: 'Сертификация - пакет со скидкой 10%',
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

function getDisplayTargetLevelName(
  targetLevel: PaymentItem['targetLevel'] | null,
  activeGroupName: string,
  cycleType?: 'CERTIFICATION' | 'RENEWAL' | null,
): string | undefined {
  if (
    cycleType === 'RENEWAL' &&
    targetLevel === 'SUPERVISOR' &&
    activeGroupName === 'Опытный супервизор'
  ) {
    return 'Опытный супервизор';
  }

  return targetLevel ? targetLevelLabels[targetLevel] : undefined;
}

function getPaymentLabel(payment: PaymentItem, targetLevel: PaymentItem['targetLevel'] | null): string {
  if (payment.type === 'RENEWAL') {
    return 'Ресертификация';
  }

  if (payment.type === 'DOCUMENT_REVIEW' && targetLevel === 'SUPERVISOR') {
    return 'Подача заявки на сертификацию и экспертиза документов';
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

  const targetLevelName = getDisplayTargetLevelName(targetLevel, activeGroupName, cycleType);

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
      activeGroupName === 'Супервизор' || activeGroupName === 'Опытный супервизор';

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
        className={`w-full flex items-start justify-between gap-4 px-6 py-4 border-b text-left ${
          highlight ? 'animate-pulse ring-2 ring-offset-2 ring-lime-400' : ''
        }`}
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-bold leading-snug text-blue-dark">
          Мои оплаты{' '}
          {cycleType === 'RENEWAL' ? (
            <span className="text-sm font-medium text-gray-600">
              (ресертификация: <strong>{targetLevelName ?? '—'}</strong>)
            </span>
          ) : targetLevelName ? (
            <span className="text-sm font-medium text-gray-600">
              (оплата за уровень: <strong>{targetLevelName}</strong>)
            </span>
          ) : activeGroupName ? (
            <span className="text-sm font-medium text-gray-600">
              (по текущему уровню: <strong>{activeGroupName}</strong>)
            </span>
          ) : null}
        </h2>
        <span className="pt-1 text-sm shrink-0">{open ? '▲' : '▼'}</span>
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
          <div className="px-6 py-5">
            {ordered.map((payment, idx) => {
              const link = getPaymentLink(payment.type, billingGroup);

              return (
                <div
                  key={payment.id}
                  className={`grid gap-x-6 gap-y-4 py-5 ${
                    idx === 0 ? '' : 'border-t'
                  } sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start`}
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <div className="min-w-0 pr-0 sm:pr-2">
                    <div className="max-w-[38rem] text-[1.06rem] font-semibold leading-[1.4] text-blue-dark break-words">
                      {getPaymentLabel(payment, targetLevel)}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-gray-600">
                      Статус: <span className="font-medium">{STATUS_LABELS[payment.status]}</span>
                    </div>

                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm leading-6 text-brand hover:underline"
                      >
                        Перейти к оплате
                      </a>
                    ) : null}
                  </div>

                  <div className="sm:pt-1 sm:pl-2 flex items-start justify-start sm:justify-end">
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
