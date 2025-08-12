import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentTypeLabels, paymentStatusLabels } from '@/utils/labels';
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
};

export default function PaymentsBlock({
  payments,
  userId,
}: {
  payments: Payment[];
  userId: string;
}) {
  if (!payments.length) return null;

  const mutate = useUpdatePaymentStatus(userId);
  const qc = useQueryClient();

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelComment, setCancelComment] = useState('');

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payments', userId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
    ]);
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const confirmPay = async (id: string) => {
    const ok = await confirmToast('Подтвердить оплату?');
    if (!ok) return;

    try {
      await mutate.mutateAsync({ id, status: 'PAID' });
      await postNotification({
        userId,
        type: 'PAYMENT',
        message: 'Оплата подтверждена',
        link: '/dashboard',
      });
      await invalidate();
      toast.success('Оплата подтверждена');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось подтвердить оплату');
    }
  };

  const startCancel = (id: string) => {
    setCancelId(id);
    setCancelComment('');
  };

  const submitCancel = async () => {
    if (!cancelId) return;
    const ok = await confirmToast('Отменить оплату?');
    if (!ok) return;

    try {
      await mutate.mutateAsync({ id: cancelId, status: 'UNPAID', comment: cancelComment });
      await postNotification({
        userId,
        type: 'PAYMENT',
        message: cancelComment.trim()
          ? `Оплата отменена администратором: ${cancelComment.trim()}`
          : 'Оплата отменена администратором',
        link: '/dashboard',
      });
      await invalidate();
      toast.success('Оплата отменена');
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
            {payments.map((p) => {
              const humanStatus = paymentStatusLabels[p.status] || p.status;
              const isThisCancel = cancelId === p.id;

              return (
                <tr
                  key={p.id}
                  className="border-t align-top"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="py-2 px-3">{paymentTypeLabels[p.type] || p.type}</td>
                  <td className="py-2 px-3">{humanStatus}</td>
                  <td className="py-2 px-3">{p.comment || '—'}</td>
                  <td className="py-2 px-3">{formatDate(p.createdAt)}</td>
                  <td className="py-2 px-3">{formatDate(p.confirmedAt)}</td>
                  <td className="py-2 px-3">
                    {!isThisCancel ? (
                      <div className="flex flex-wrap gap-2">
                        {p.status !== 'PAID' && (
                          <button
                            className="btn btn-brand disabled:opacity-50"
                            onClick={() => confirmPay(p.id)}
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
                          {p.status === 'PAID' ? 'Отменить оплату' : 'Отменить'}
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
                            onClick={submitCancel}
                            disabled={mutate.isPending}
                          >
                            Подтвердить отмену
                          </button>
                          <button
                            className="btn disabled:opacity-50"
                            onClick={cancelCancel}
                            disabled={mutate.isPending}
                          >
                            Отмена
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
