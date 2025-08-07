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
  const { data, isLoading } = useUserPayments();

  if (isLoading || !data) return null;

  return (
    <div className="bg-white border rounded shadow p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-blue-dark mb-2">
        Мои оплаты {activeGroupName ? `(Текущий уровень: ${activeGroupName})` : ''}
      </h2>

      {ORDERED_TYPES.map((type) => {
        const payment = data.find((p) => p.type === type);
        if (!payment) return null;

        const link = getPaymentLink(type, activeGroupName);

        return (
          <div
            key={payment.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-col gap-1">
              <div className="font-semibold">{LABELS[payment.type]}</div>

              <div className="text-sm text-gray-600">
                Статус: <span className="font-medium">{STATUS_LABELS[payment.status]}</span>
              </div>

              {link !== '#' && (
                <div className="text-sm">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Перейти к оплате
                  </a>
                </div>
              )}
            </div>

            <div className="mt-3 sm:mt-0">
              <PaymentStatusToggle payment={payment} isAdmin={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
