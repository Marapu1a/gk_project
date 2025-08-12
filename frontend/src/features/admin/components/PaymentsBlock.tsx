import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentTypeLabels, paymentStatusLabels } from '@/utils/labels';
import { useUpdatePaymentStatus } from '@/features/payment/hooks/useUpdatePaymentStatus';
import { postNotification } from '@/features/notifications/api/notifications';

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

  const confirm = async (id: string) => {
    await mutate.mutateAsync({ id, status: 'PAID' });
    await postNotification({
      userId,
      type: 'PAYMENT',
      message: 'Оплата подтверждена',
      link: '/dashboard',
    });
    qc.invalidateQueries({ queryKey: ['payments', userId] });
    qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
  };

  const startCancel = (id: string) => {
    setCancelId(id);
    setCancelComment('');
  };

  const submitCancel = async () => {
    if (!cancelId) return;
    await mutate.mutateAsync({ id: cancelId, status: 'UNPAID', comment: cancelComment });
    await postNotification({
      userId,
      type: 'PAYMENT',
      message: cancelComment.trim()
        ? `Оплата отменена администратором: ${cancelComment.trim()}`
        : 'Оплата отменена администратором',
      link: '/dashboard',
    });
    qc.invalidateQueries({ queryKey: ['payments', userId] });
    qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
    setCancelId(null);
    setCancelComment('');
  };

  const cancelCancel = () => {
    setCancelId(null);
    setCancelComment('');
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-blue-dark">Платежи</h2>

      <table className="w-full text-sm border rounded-xl overflow-hidden bg-white shadow">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="py-2 px-3">Тип</th>
            <th className="py-2 px-3">Статус</th>
            <th className="py-2 px-3">Комментарий</th>
            <th className="py-2 px-3">Создан</th>
            <th className="py-2 px-3">Подтвержден</th>
            <th className="py-2 px-3 w-64">Действия</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const humanStatus = paymentStatusLabels[p.status] || p.status;
            const isThisCancel = cancelId === p.id;

            return (
              <tr key={p.id} className="border-t align-top">
                <td className="py-2 px-3">{paymentTypeLabels[p.type] || p.type}</td>
                <td className="py-2 px-3">{humanStatus}</td>
                <td className="py-2 px-3">{p.comment || '—'}</td>
                <td className="py-2 px-3">{formatDate(p.createdAt)}</td>
                <td className="py-2 px-3">{formatDate(p.confirmedAt)}</td>
                <td className="py-1 px-3">
                  {!isThisCancel ? (
                    <div className="flex flex-wrap gap-2">
                      {p.status !== 'PAID' && (
                        <button
                          className="btn btn-brand"
                          onClick={() => confirm(p.id)}
                          disabled={mutate.isPending}
                        >
                          Подтвердить
                        </button>
                      )}

                      <button
                        className="btn btn-danger"
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
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn btn-danger"
                          onClick={submitCancel}
                          disabled={mutate.isPending}
                        >
                          Подтвердить отмену
                        </button>
                        <button className="btn" onClick={cancelCancel} disabled={mutate.isPending}>
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
  );
}
