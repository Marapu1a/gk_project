import { useMemo, useState } from 'react';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import type { PaymentItem } from '@/features/payment/api/getUserPayments';
import { PaymentCard } from './PaymentCard';
import { PaymentModal } from './PaymentModal';
import { PaymentStatusIcon } from './PaymentStatusIcon';

const LABELS: Record<PaymentItem['type'], string> = {
  FULL_PACKAGE: 'Сертификация - пакет со скидкой 10%',
  REGISTRATION: 'Подача заявки на сертификацию и учет часов практики',
  DOCUMENT_REVIEW: 'Экспертиза документов',
  EXAM_ACCESS: 'Экзамен',
  RENEWAL: 'Ресертификация',
};

const ORDER: PaymentItem['type'][] = [
  'FULL_PACKAGE',
  'REGISTRATION',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
];

type Props = {
  activeGroupName: string;
  targetLevelName?: string;
};

function resolveBillingGroup(targetLevelName?: string, activeGroupName?: string): string {
  if (targetLevelName === 'Инструктор') return 'соискатель';
  if (targetLevelName === 'Куратор') return 'инструктор';
  if (targetLevelName === 'Супервизор') return 'куратор';

  if (activeGroupName === 'Соискатель') return 'соискатель';
  if (activeGroupName === 'Инструктор') return 'инструктор';
  if (activeGroupName === 'Куратор') return 'куратор';

  return '';
}

function PaymentSummary({ subtitle }: { subtitle: string }) {
  return (
    <section className="card-section flex min-h-[330px] flex-col items-center px-5 py-5">
      <h2 className="mb-8 text-center text-[18px] font-semibold text-[#1F305E]">Оплата</h2>

      <p className="mb-10 text-center text-[14px] text-[#8D96B5]">{subtitle}</p>

      <div className="flex flex-1 items-center justify-center">
        <PaymentStatusIcon className="h-24 w-24" />
      </div>
    </section>
  );
}

function PaymentEmptyState() {
  return (
    <section className="card-section flex min-h-[330px] items-center justify-center px-6 py-6">
      <p className="max-w-[260px] text-center text-[14px] leading-[1.35] text-[#8D96B5]">
        Выберите целевой уровень сертификации, чтобы продолжить
      </p>
    </section>
  );
}

export function PaymentBlock({ activeGroupName, targetLevelName }: Props) {
  const { data: payments, isLoading } = useUserPayments();
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  const billingGroup = resolveBillingGroup(targetLevelName, activeGroupName);
  const isSupervisorTarget = targetLevelName === 'Супервизор';

  const preparedPayments = useMemo(() => {
    if (!payments) return [];

    const visibleTypes = isSupervisorTarget
      ? ORDER.filter((type) => type !== 'REGISTRATION')
      : ORDER;

    const fullPackage = payments.find((p) => p.type === 'FULL_PACKAGE');
    const isPackagePending = fullPackage?.status === 'PENDING';

    const packageDisabled = payments.some(
      (payment) => payment.type !== 'FULL_PACKAGE' && payment.status === 'PAID',
    );

    return visibleTypes
      .map((type) => {
        const payment = payments.find((item) => item.type === type);
        if (!payment) return null;

        let uiDisabled = false;
        let disabledReason: string | undefined;

        if (payment.type === 'FULL_PACKAGE') {
          uiDisabled = packageDisabled;
          if (packageDisabled) {
            disabledReason = 'Пакет недоступен';
          }
        } else if (isPackagePending && payment.status === 'UNPAID') {
          uiDisabled = true;
          disabledReason = 'Ждём подтверждения пакетной оплаты';
        }

        return {
          ...payment,
          uiDisabled,
          disabledReason,
        };
      })
      .filter(Boolean) as (PaymentItem & {
      uiDisabled: boolean;
      disabledReason?: string;
    })[];
  }, [payments, isSupervisorTarget]);

  if (isLoading || !payments?.length) {
    return null;
  }

  if (!targetLevelName) {
    return <PaymentEmptyState />;
  }

  const visibleNonPackagePayments = preparedPayments.filter((p) => p.type !== 'FULL_PACKAGE');
  const fullPackagePayment = preparedPayments.find((p) => p.type === 'FULL_PACKAGE');

  const isFullPackagePaid = fullPackagePayment?.status === 'PAID';

  const areAllSeparatePaid =
    visibleNonPackagePayments.length > 0 &&
    visibleNonPackagePayments.every((payment) => payment.status === 'PAID');

  if (isFullPackagePaid) {
    return <PaymentSummary subtitle="Сертификация - пакет со скидкой 10% оплачена" />;
  }

  if (areAllSeparatePaid) {
    return <PaymentSummary subtitle="Все услуги оплачены" />;
  }

  return (
    <>
      <section className="card-section px-5 py-5">
        <h2 className="mb-5 text-center text-[18px] font-semibold text-[#1F305E]">Оплата</h2>

        <div className="mb-5 rounded-[16px] bg-[#DDE8EB] px-5 py-3 text-center text-[16px] font-semibold text-[#1F305E]">
          {targetLevelName}
        </div>

        <div className="space-y-4">
          {preparedPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              title={
                payment.type === 'DOCUMENT_REVIEW' && targetLevelName === 'Супервизор'
                  ? 'Подача заявки на сертификацию, экспертиза документов на уровень Супервизор ПАП'
                  : LABELS[payment.type]
              }
              status={payment.status}
              isFullPackage={payment.type === 'FULL_PACKAGE'}
              disabled={payment.uiDisabled}
              disabledReason={payment.disabledReason}
              onPay={payment.uiDisabled ? undefined : () => setSelectedPayment(payment)}
            />
          ))}
        </div>
      </section>

      <PaymentModal
        payment={selectedPayment}
        billingGroup={billingGroup}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  );
}
