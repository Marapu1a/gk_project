import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentStatusLabels, paymentTypeLabels } from '@/utils/labels';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { useUpdatePaymentStatus } from '@/features/payment/hooks/useUpdatePaymentStatus';
import { AdminNotifyChoiceModal } from './AdminNotifyChoiceModal';

type Payment = {
  id: string;
  type: string;
  status: string;
  comment: string | null;
  createdAt: string;
  requestedAt: string | null;
  confirmedAt: string | null;
  targetLevel?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
};

type ActiveCycle = {
  id: string;
  type: 'CERTIFICATION' | 'RENEWAL';
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
} | null;

type Props = {
  payments: Payment[];
  userId: string;
  activeGroupName?: string | null;
  activeCycle?: ActiveCycle;
};

type PaymentAction = {
  payment: Payment;
  nextStatus: 'PAID' | 'UNPAID';
} | null;

const TYPE_ORDER: Record<string, number> = {
  FULL_PACKAGE: 0,
  REGISTRATION: 1,
  RENEWAL: 2,
  DOCUMENT_REVIEW: 3,
  EXAM_ACCESS: 4,
};

const TARGET_LEVEL_ORDER: Record<NonNullable<Payment['targetLevel']>, number> = {
  INSTRUCTOR: 0,
  CURATOR: 1,
  SUPERVISOR: 2,
};

const CERTIFICATION_PAYMENT_TYPES = [
  'FULL_PACKAGE',
  'REGISTRATION',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
];

const SUPERVISOR_CERTIFICATION_PAYMENT_TYPES = [
  'FULL_PACKAGE',
  'DOCUMENT_REVIEW',
  'EXAM_ACCESS',
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusToneClass(status: string, inheritedPending: boolean) {
  if (inheritedPending) return 'bg-[#FFF0C2] text-[#8A6200]';
  if (status === 'PAID') return 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]';
  if (status === 'PENDING') return 'bg-[#FFF0C2] text-[#8A6200]';
  return 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]';
}

export default function PaymentsBlock({
  payments,
  userId,
  activeGroupName,
  activeCycle = null,
}: Props) {
  const mutate = useUpdatePaymentStatus(userId);
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PaymentAction>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['payments', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]);
  };

  const visiblePayments = useMemo(() => {
    if (!activeCycle) return [];

    const belongsToActiveLevel = (payment: Payment) =>
      !payment.targetLevel || payment.targetLevel === activeCycle.targetLevel;

    if (activeCycle.type === 'RENEWAL') {
      return payments.filter(
        (payment) =>
          payment.type === 'RENEWAL' && payment.targetLevel === activeCycle.targetLevel,
      );
    }

    const visibleTypes =
      activeCycle.targetLevel === 'SUPERVISOR'
        ? SUPERVISOR_CERTIFICATION_PAYMENT_TYPES
        : CERTIFICATION_PAYMENT_TYPES;

    const matchingPayments = payments.filter(
      (payment) => visibleTypes.includes(payment.type) && belongsToActiveLevel(payment),
    );

    return visibleTypes
      .map((type) =>
        matchingPayments
          .filter((payment) => payment.type === type)
          .sort((a, b) => {
            if (a.targetLevel === activeCycle.targetLevel && b.targetLevel !== activeCycle.targetLevel) {
              return -1;
            }
            if (b.targetLevel === activeCycle.targetLevel && a.targetLevel !== activeCycle.targetLevel) {
              return 1;
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })[0] ?? null,
      )
      .filter((payment): payment is Payment => Boolean(payment));
  }, [activeCycle, payments]);

  const sortedPayments = useMemo(() => {
    return [...visiblePayments].sort((a, b) => {
      const typeDiff = (TYPE_ORDER[a.type] ?? 999) - (TYPE_ORDER[b.type] ?? 999);
      if (typeDiff !== 0) return typeDiff;

      if (a.type === 'RENEWAL' && b.type === 'RENEWAL') {
        const levelDiff =
          (TARGET_LEVEL_ORDER[a.targetLevel as keyof typeof TARGET_LEVEL_ORDER] ?? 999) -
          (TARGET_LEVEL_ORDER[b.targetLevel as keyof typeof TARGET_LEVEL_ORDER] ?? 999);
        if (levelDiff !== 0) return levelDiff;
      }

      const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (createdAtDiff !== 0) return createdAtDiff;

      return a.id.localeCompare(b.id);
    });
  }, [visiblePayments]);

  const fullPackage = visiblePayments.find((payment) => payment.type === 'FULL_PACKAGE');
  const isFullPackageActive = fullPackage?.status === 'PENDING' || fullPackage?.status === 'PAID';

  const getDisplayStatus = (payment: Payment) => {
    if (isFullPackageActive && payment.type !== 'FULL_PACKAGE') {
      return 'В составе пакета';
    }

    return paymentStatusLabels[payment.status] || payment.status;
  };

  const getPaymentLabel = (payment: Payment) => {
    if (payment.type === 'RENEWAL') {
      if (payment.targetLevel === 'INSTRUCTOR') return 'Ресертификация - Инструктор';
      if (payment.targetLevel === 'CURATOR') return 'Ресертификация - Куратор';

      if (payment.targetLevel === 'SUPERVISOR') {
        return activeGroupName === 'Опытный Супервизор'
          ? 'Ресертификация - Опытный супервизор'
          : 'Ресертификация - Супервизор';
      }

      return 'Ресертификация';
    }

    return paymentTypeLabels[payment.type] || payment.type;
  };

  const submitAction = async (notify: boolean) => {
    if (!pendingAction) return;

    const { payment, nextStatus } = pendingAction;

    try {
      await mutate.mutateAsync({
        id: payment.id,
        status: nextStatus,
        notify,
      });
      await invalidate();
      setPendingAction(null);
      toast.success(
        nextStatus === 'PAID'
          ? notify
            ? UI_TOAST_MESSAGES.payment.confirmedNotify
            : UI_TOAST_MESSAGES.payment.confirmedQuiet
          : notify
            ? UI_TOAST_MESSAGES.payment.canceledNotify
            : UI_TOAST_MESSAGES.payment.canceledQuiet,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.payment.updateFailed);
    }
  };

  const emptyText = !activeCycle
    ? 'Нет активного цикла сертификации или ресертификации.'
    : 'Для активного цикла нет доступных платежей.';

  return (
    <div className="space-y-4">
      <h2 className="dashboard-v2-title">Платежи</h2>

      {!sortedPayments.length ? (
        <div className="rounded-[16px] bg-[var(--color-blue-soft)] px-4 py-5 dashboard-v2-text text-[#8D96B5]">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-[var(--color-blue-soft)] bg-white">
          {sortedPayments.map((payment, index) => {
            const isPaid = payment.status === 'PAID';
            const nextStatus = isPaid ? 'UNPAID' : 'PAID';
            const inheritedPending =
              Boolean(isFullPackageActive) && payment.type !== 'FULL_PACKAGE';

            return (
              <div
                key={payment.id}
                className={`grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px_180px] lg:items-center ${
                  index > 0 ? 'border-t border-[var(--color-blue-soft)]' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold leading-[1.25] text-[#1F305E]">
                    {getPaymentLabel(payment)}
                  </div>
                  <div className="mt-2 inline-flex min-h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold">
                    <span
                      className={`inline-flex min-h-[26px] items-center rounded-full px-3 ${statusToneClass(
                        payment.status,
                        inheritedPending,
                      )}`}
                    >
                      {getDisplayStatus(payment)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <DateBox label="Отмечено" value={formatDateTime(payment.requestedAt)} />
                  <DateBox label="Подтверждено" value={formatDateTime(payment.confirmedAt)} />
                </div>

                <div className="flex justify-end">
                  {inheritedPending ? (
                    <div className="dashboard-v2-action flex min-h-[44px] w-full max-w-[180px] items-center justify-center rounded-[999px] bg-[var(--color-blue-soft)] px-4 text-center text-[13px] font-extrabold leading-tight text-[#7F8AA3]">
                      Управляется пакетом
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`btn dashboard-v2-action w-full max-w-[180px] ${
                        isPaid
                          ? 'dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)]'
                          : 'dashboard-v2-action-primary'
                      }`}
                      onClick={() => setPendingAction({ payment, nextStatus })}
                      disabled={mutate.isPending}
                    >
                      {isPaid ? 'Отменить' : 'Подтвердить'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingAction ? (
        <AdminNotifyChoiceModal
          title={pendingAction.nextStatus === 'PAID' ? 'Подтвердить оплату?' : 'Отменить оплату?'}
          message={
            pendingAction.payment.type === 'FULL_PACKAGE' && pendingAction.nextStatus === 'UNPAID'
              ? 'Будет отменена пакетная оплата и все связанные платежи этого уровня. Отправить пользователю уведомление?'
              : 'Отправить пользователю уведомление об этом действии?'
          }
          danger={pendingAction.nextStatus === 'UNPAID'}
          isPending={mutate.isPending}
          onChoose={(notify) => void submitAction(notify)}
          onClose={() => setPendingAction(null)}
        />
      ) : null}
    </div>
  );
}

function DateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-blue-soft)] px-3 py-2">
      <div className="text-[12px] font-semibold text-[#7F8AA3]">{label}</div>
      <div className="mt-1 text-[13px] font-bold leading-[1.25] text-[#1F305E]">{value}</div>
    </div>
  );
}
