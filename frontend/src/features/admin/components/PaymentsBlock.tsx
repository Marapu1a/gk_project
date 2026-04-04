// src/features/admin/components/PaymentsBlock.tsx
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentStatusLabels, paymentTypeLabels } from '@/utils/labels';
import { useUpdatePaymentStatus } from '@/features/payment/hooks/useUpdatePaymentStatus';
import { postNotification } from '@/features/notifications/api/notifications';
import { toast } from 'sonner';

type Payment = {
  id: string;
  type: string;
  status: string;
  comment: string | null;
  createdAt: string;
  confirmedAt: string | null;
  targetLevel?: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
};

type Props = {
  payments: Payment[];
  userId: string;
  activeGroupName?: string | null;
};

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

export default function PaymentsBlock({ payments, userId, activeGroupName }: Props) {
  const mutate = useUpdatePaymentStatus(userId);
  const qc = useQueryClient();

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelComment, setCancelComment] = useState('');

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payments'] }),
      qc.invalidateQueries({ queryKey: ['payments', 'me'] }),
      qc.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
    ]);
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const fullPackage = payments.find((p) => p.type === 'FULL_PACKAGE');
  const isFullPackagePending = fullPackage?.status === 'PENDING';

  const getDisplayStatus = (payment: Payment) => {
    if (isFullPackagePending && payment.type !== 'FULL_PACKAGE' && payment.status === 'UNPAID') {
      return 'Ожидает подтверждения пакетной оплаты';
    }

    return paymentStatusLabels[payment.status] || payment.status;
  };

  const getPaymentLabel = (payment: Payment) => {
    if (payment.type === 'RENEWAL') {
      if (payment.targetLevel === 'INSTRUCTOR') return 'Ресертификация — Инструктор';
      if (payment.targetLevel === 'CURATOR') return 'Ресертификация — Куратор';

      if (payment.targetLevel === 'SUPERVISOR') {
        if (activeGroupName === 'Опытный Супервизор') {
          return 'Ресертификация — Опытный супервизор';
        }

        return 'Ресертификация — Супервизор';
      }

      return 'Ресертификация';
    }

    return paymentTypeLabels[payment.type] || payment.type;
  };

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
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
  }, [payments]);

  const getRowStyle = (payment: Payment): React.CSSProperties => {
    if (isFullPackagePending && payment.type !== 'FULL_PACKAGE' && payment.status === 'UNPAID') {
      return {
        background: 'rgba(255, 248, 220, 0.55)',
      };
    }

    if (payment.status === 'PENDING') {
      return {
        background: 'rgba(255, 244, 204, 0.95)',
      };
    }

    if (payment.status === 'PAID') {
      return {
        background: 'rgba(214, 239, 139, 0.28)',
      };
    }

    return {
      background: 'transparent',
    };
  };

  const getStatusToneClass = (payment: Payment) => {
    if (isFullPackagePending && payment.type !== 'FULL_PACKAGE' && payment.status === 'UNPAID') {
      return 'text-amber-700 font-medium';
    }

    if (payment.status === 'PENDING') {
      return 'text-amber-700 font-semibold';
    }

    if (payment.status === 'PAID') {
      return 'text-green-700 font-medium';
    }

    return 'text-gray-700';
  };

  const confirmPay = async (id: string, type: string) => {
    const ok = await confirmToast(
      type === 'FULL_PACKAGE' ? 'Подтвердить пакетную оплату?' : 'Подтвердить оплату?',
    );
    if (!ok) return;

    try {
      await mutate.mutateAsync({ id, status: 'PAID' });

      try {
        await postNotification({
          userId,
          type: 'PAYMENT',
          message: type === 'FULL_PACKAGE' ? 'Пакетная оплата подтверждена' : 'Оплата подтверждена',
          link: '/dashboard',
        });
      } catch {
        //
      }

      await invalidate();
      toast.success(
        type === 'FULL_PACKAGE' ? 'Пакетная оплата подтверждена' : 'Оплата подтверждена',
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось подтвердить оплату');
    }
  };

  const startCancel = (id: string) => {
    setCancelId(id);
    setCancelComment('');
  };

  const submitCancel = async (type: string) => {
    if (!cancelId) return;

    const ok = await confirmToast(
      type === 'FULL_PACKAGE' ? 'Отменить пакетную оплату?' : 'Отменить оплату?',
    );
    if (!ok) return;

    try {
      await mutate.mutateAsync({ id: cancelId, status: 'UNPAID', comment: cancelComment });

      try {
        await postNotification({
          userId,
          type: 'PAYMENT',
          message: cancelComment.trim()
            ? `${
                type === 'FULL_PACKAGE' ? 'Пакетная оплата' : 'Оплата'
              } отменена администратором: ${cancelComment.trim()}`
            : `${type === 'FULL_PACKAGE' ? 'Пакетная оплата' : 'Оплата'} отменена администратором`,
          link: '/dashboard',
        });
      } catch {
        //
      }

      await invalidate();
      toast.success(type === 'FULL_PACKAGE' ? 'Пакетная оплата отменена' : 'Оплата отменена');
      setCancelId(null);
      setCancelComment('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось отменить оплату');
    }
  };

  const cancelCancel = () => {
    setCancelId(null);
    setCancelComment('');
  };

  if (!payments.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-blue-dark">Платежи</h2>

      <div
        className="overflow-x-auto rounded-2xl border bg-white header-shadow"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="py-2 px-3 text-left">Тип</th>
              <th className="py-2 px-3 text-left">Статус</th>
              <th className="py-2 px-3 text-left">Комментарий</th>
              <th className="py-2 px-3 text-left">Создан</th>
              <th className="py-2 px-3 text-left">Подтверждён</th>
              <th className="py-2 px-3 text-left w-64">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((p) => {
              const humanStatus = getDisplayStatus(p);
              const isThisCancel = cancelId === p.id;

              return (
                <tr
                  key={p.id}
                  className="border-t align-top transition-colors"
                  style={{
                    borderColor: 'var(--color-green-light)',
                    ...getRowStyle(p),
                  }}
                >
                  <td className="py-2 px-3">
                    <div className="font-medium text-blue-dark">{getPaymentLabel(p)}</div>
                  </td>

                  <td className="py-2 px-3">
                    <span className={getStatusToneClass(p)}>{humanStatus}</span>
                  </td>

                  <td className="py-2 px-3">{p.comment || '—'}</td>
                  <td className="py-2 px-3">{formatDate(p.createdAt)}</td>
                  <td className="py-2 px-3">{formatDate(p.confirmedAt)}</td>

                  <td className="py-2 px-3">
                    {!isThisCancel ? (
                      <div className="flex flex-wrap gap-2">
                        {p.status !== 'PAID' && (
                          <button
                            className="btn btn-brand disabled:opacity-50"
                            onClick={() => confirmPay(p.id, p.type)}
                            disabled={mutate.isPending}
                          >
                            Подтвердить
                          </button>
                        )}

                        <button
                          className="btn btn-danger disabled:opacity-50"
                          onClick={() => startCancel(p.id)}
                          disabled={mutate.isPending}
                        >
                          Отменить
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          className="input"
                          placeholder="Комментарий (по желанию)"
                          value={cancelComment}
                          onChange={(e) => setCancelComment(e.target.value)}
                          disabled={mutate.isPending}
                        />
                        <div className="flex gap-2">
                          <button
                            className="btn btn-danger disabled:opacity-50"
                            onClick={() => submitCancel(p.type)}
                            disabled={mutate.isPending}
                          >
                            Подтвердить
                          </button>
                          <button
                            className="btn disabled:opacity-50"
                            onClick={cancelCancel}
                            disabled={mutate.isPending}
                          >
                            Отменить
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
