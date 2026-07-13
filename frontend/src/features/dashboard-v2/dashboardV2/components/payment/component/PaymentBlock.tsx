// src/features/dashboard-v2/dashboardV2/components/payment-block/PaymentBlock.tsx
import { useMemo, useState } from 'react';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import type { PaymentItem } from '@/features/payment/api/getUserPayments';
import { PaymentCard } from './PaymentCard';
import { PaymentModal } from './PaymentModal';
import { PaymentStatusIcon } from './PaymentStatusIcon';
import { formatCertificationLevelName, getShortPaymentTypeLabel } from '@/utils/labels';
import {
  areRequiredPaymentsPaid,
  findPaymentForTarget,
  getVisiblePaymentTypes,
  hasPaidSeparatePayment,
  hasPaymentStatus,
  isFullPackageActive,
  resolveBillingGroup,
} from '@/features/payment/model/paymentPolicy';

type Props = {
  activeGroupName: string;
  targetLevel: PaymentItem['targetLevel'] | null;
  targetLevelName?: string;
  cycleType?: 'CERTIFICATION' | 'RENEWAL' | null;
  externalClaimActive?: boolean;
};

function PaymentSummary({ subtitle }: { subtitle: string }) {
  return (
    <section className="card-section flex h-full min-h-[340px] w-full flex-col items-center px-5 py-6 shadow-soft">
      <h2 className="dashboard-v2-title mb-6 text-center">Оплата</h2>
      <p className="dashboard-v2-text mb-8 text-center text-[#8D96B5]">{subtitle}</p>
      <div className="flex flex-1 items-center justify-center">
        <PaymentStatusIcon className="h-24 w-24" />
      </div>
    </section>
  );
}

function PaymentEmptyState({ externalClaimActive }: { externalClaimActive?: boolean }) {
  return (
    <section className="card-section flex h-full min-h-[340px] w-full items-center justify-center px-6 py-6 shadow-soft">
      <p className="dashboard-v2-text max-w-[260px] text-center text-[#8D96B5]">
        {externalClaimActive
          ? 'Оплата будет доступна после настройки профиля администратором'
          : 'Выберите цель сертификации, чтобы продолжить'}
      </p>
    </section>
  );
}

export function PaymentBlock({ activeGroupName, targetLevel, targetLevelName, cycleType, externalClaimActive }: Props) {
  const { data: payments, isLoading } = useUserPayments();
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  const billingGroup = resolveBillingGroup(targetLevelName, activeGroupName);
  const isRenewalCycle = cycleType === 'RENEWAL';
  const displayTargetLevelName =
    isRenewalCycle &&
    targetLevelName === 'Супервизор' &&
    (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор')
      ? 'Опытный супервизор'
      : formatCertificationLevelName(targetLevelName);

  const preparedPayments = useMemo(() => {
    if (!payments) return [];

    if (isRenewalCycle) {
      return payments
        .filter(
          (payment) =>
            payment.type === 'RENEWAL' &&
            (payment.targetLevel == null || payment.targetLevel === targetLevel),
        )
        .map((payment) => ({
          ...payment,
          uiDisabled: false,
          disabledReason: undefined,
        }));
    }

    const visibleTypes = getVisiblePaymentTypes('CERTIFICATION', targetLevel);

    const fullPackage = findPaymentForTarget(payments, 'FULL_PACKAGE', targetLevel);
    const isPackageActive = isFullPackageActive(payments, targetLevel);
    const hasPaidSeparate = hasPaidSeparatePayment(payments, targetLevel);

    if (isPackageActive && fullPackage && visibleTypes.includes('FULL_PACKAGE')) {
      return [
        {
          ...fullPackage,
          uiDisabled: false,
          disabledReason: undefined,
        },
      ];
    }

    return visibleTypes
      .map((type) => {
        const payment = findPaymentForTarget(payments, type, targetLevel);
        if (!payment) return null;

        let uiDisabled = false;
        let disabledReason: string | undefined;

        if (payment.type === 'FULL_PACKAGE') {
          uiDisabled = hasPaidSeparate;
          disabledReason = hasPaidSeparate
            ? 'Пакет недоступен: уже принят отдельный платеж'
            : undefined;
        } else if (isPackageActive) {
          uiDisabled = true;
          disabledReason = 'Платеж входит в пакет';
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
  }, [payments, isRenewalCycle, targetLevel]);

  if (isLoading || !payments?.length) {
    return null;
  }

  if (!targetLevelName) {
    return <PaymentEmptyState externalClaimActive={externalClaimActive} />;
  }

  const isFullPackagePaid = hasPaymentStatus(
    payments,
    'FULL_PACKAGE',
    'PAID',
    targetLevel,
  );
  const areAllRequiredPaid = areRequiredPaymentsPaid(
    payments,
    isRenewalCycle ? 'RENEWAL' : 'CERTIFICATION',
    targetLevel,
  );

  if (isFullPackagePaid) {
    return (
      <PaymentSummary
        subtitle={`${getShortPaymentTypeLabel('FULL_PACKAGE')} оплачена`}
      />
    );
  }

  if (areAllRequiredPaid) {
    return (
      <PaymentSummary subtitle={isRenewalCycle ? 'Ресертификация оплачена' : 'Все услуги оплачены'} />
    );
  }

  return (
    <>
      <section className="card-section flex h-full min-h-[340px] w-full flex-col overflow-hidden px-5 py-6 shadow-soft">
        <h2 className="dashboard-v2-title mb-5 text-center">Оплата</h2>

        <div className="dashboard-v2-label dashboard-v2-level-pill mb-5">
          {displayTargetLevelName}
        </div>

        <div className="-mx-1 flex flex-1 flex-col justify-center gap-3">
          {preparedPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              title={getShortPaymentTypeLabel(payment.type, { targetLevel })}
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
