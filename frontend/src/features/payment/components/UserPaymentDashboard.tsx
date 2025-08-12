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
};

export function UserPaymentDashboard({ activeGroupName }: Props) {
  const { data: payments, isLoading } = useUserPayments();
  if (isLoading || !payments) return null;

  const ordered = ORDERED_TYPES.map((t) => payments.find((p) => p.type === t)).filter(
    Boolean,
  ) as PaymentItem[];

  return (
    <div
      className="w-full rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h2 className="text-xl font-bold text-blue-dark">
          Мои оплаты {activeGroupName ? `(Текущий уровень: ${activeGroupName})` : ''}
        </h2>
      </div>

      {/* Body */}
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
  );
}
