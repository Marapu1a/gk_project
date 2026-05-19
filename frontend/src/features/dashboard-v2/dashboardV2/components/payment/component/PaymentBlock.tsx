// src/features/dashboard-v2/dashboardV2/components/payment-block/PaymentBlock.tsx
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
  targetLevel: PaymentItem['targetLevel'] | null;
  targetLevelName?: string;
  cycleType?: 'CERTIFICATION' | 'RENEWAL' | null;
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
    <section className="card-section flex h-full min-h-[340px] w-full flex-col items-center px-5 py-6 shadow-soft">
      <h2 className="dashboard-v2-title mb-6 text-center">Оплата</h2>
      <p className="mb-8 text-center text-[14px] text-[#8D96B5]">{subtitle}</p>
      <div className="flex flex-1 items-center justify-center">
        <PaymentStatusIcon className="h-24 w-24" />
      </div>
    </section>
  );
}

function PaymentEmptyState() {
  return (
    <section className="card-section flex h-full min-h-[340px] w-full items-center justify-center px-6 py-6 shadow-soft">
      <p className="max-w-[260px] text-center text-[14px] leading-[1.35] text-[#8D96B5]">
        Выберите целевой уровень сертификации, чтобы продолжить
      </p>
    </section>
  );
}

export function PaymentBlock({ activeGroupName, targetLevel, targetLevelName, cycleType }: Props) {
  const { data: payments, isLoading } = useUserPayments();
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  const billingGroup = resolveBillingGroup(targetLevelName, activeGroupName);
  const isRenewalCycle = cycleType === 'RENEWAL';
  const isSupervisorTarget = targetLevel === 'SUPERVISOR';

  const preparedPayments = useMemo(() => {
    if (!payments) return [];

    if (isRenewalCycle) {
      return payments
        .filter((payment) => payment.type === 'RENEWAL' && payment.targetLevel === targetLevel)
        .map((payment) => ({
          ...payment,
          uiDisabled: false,
          disabledReason: undefined,
        }));
    }

    const visibleTypes = isSupervisorTarget
      ? ORDER.filter((type) => type !== 'REGISTRATION')
      : ORDER;

    const fullPackage = payments.find((p) => p.type === 'FULL_PACKAGE');
    const isPackagePending = fullPackage?.status === 'PENDING';

    return visibleTypes
      .map((type) => {
        const payment = payments.find((item) => item.type === type);
        if (!payment) return null;

        let uiDisabled = false;
        let disabledReason: string | undefined;

        if (payment.type === 'FULL_PACKAGE') {
          uiDisabled = false;
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
  }, [payments, isRenewalCycle, isSupervisorTarget, targetLevel]);

  if (isLoading || !payments?.length) {
    return null;
  }

  if (!targetLevelName) {
    return <PaymentEmptyState />;
  }

  const fullPackagePayment = preparedPayments.find((p) => p.type === 'FULL_PACKAGE');
  const isFullPackagePaid = fullPackagePayment?.status === 'PAID';

  const visibleNonPackagePayments = preparedPayments.filter((p) => p.type !== 'FULL_PACKAGE');

  const areAllSeparatePaid = isRenewalCycle
    ? preparedPayments.length > 0 && preparedPayments.every((payment) => payment.status === 'PAID')
    : isSupervisorTarget
      ? (() => {
          const documentReview = payments.find((p) => p.type === 'DOCUMENT_REVIEW');
          const registration = payments.find((p) => p.type === 'REGISTRATION');
          const exam = payments.find((p) => p.type === 'EXAM_ACCESS');

          return Boolean(
            documentReview &&
              registration &&
              exam &&
              documentReview.status === 'PAID' &&
              registration.status === 'PAID' &&
              exam.status === 'PAID',
          );
        })()
      : visibleNonPackagePayments.length > 0 &&
        visibleNonPackagePayments.every((payment) => payment.status === 'PAID');

  if (isFullPackagePaid) {
    return <PaymentSummary subtitle="Сертификация - пакет со скидкой 10% оплачена" />;
  }

  if (areAllSeparatePaid) {
    return (
      <PaymentSummary subtitle={isRenewalCycle ? 'Ресертификация оплачена' : 'Все услуги оплачены'} />
    );
  }

  return (
    <>
      <section className="card-section flex h-full min-h-[340px] w-full flex-col overflow-hidden px-5 py-6 shadow-soft">
        <h2 className="dashboard-v2-title mb-5 text-center">Оплата</h2>

        <div className="mb-5 flex h-[42px] items-center justify-center rounded-[14px] bg-[var(--color-blue-soft)] px-5 text-center text-[16px] font-medium text-[#1F305E]">
          {targetLevelName}
        </div>

        <div className="-mx-1 flex flex-1 flex-col justify-center gap-3">
          {preparedPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              title={
                payment.type === 'DOCUMENT_REVIEW' && targetLevel === 'SUPERVISOR'
                  ? 'Подача заявки на сертификацию, экспертиза документов'
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
        payments={payments}
        billingGroup={billingGroup}
        targetLevelName={targetLevelName}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  );
}
