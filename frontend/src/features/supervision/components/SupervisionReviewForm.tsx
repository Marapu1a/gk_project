import { useState, useMemo } from 'react';
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { postNotification } from '@/features/notifications/api/notifications';
import { toast } from 'sonner';
import type { AssignedHourItem } from '../api/getAssignedHours';

export function SupervisionReviewForm() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: queryStatus,
  } = useAssignedHours({ status: 'UNCONFIRMED', take: 25 });

  const mutation = useUpdateHourStatus();
  const [rejectedReasonMap, setRejectedReasonMap] = useState<Record<string, string>>({});

  const hours: AssignedHourItem[] = useMemo(
    () => (data ? data.pages.flatMap((p) => p.hours) : []),
    [data],
  );

  const typeMap: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
    INSTRUCTOR: 'Инструктор',
    CURATOR: 'Куратор',
    SUPERVISOR: 'Менторство',
  };

  const handleConfirm = async (id: string, userId: string, userEmail: string) => {
    try {
      await mutation.mutateAsync({ id, status: 'CONFIRMED' });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Ваши часы супервизии подтверждены (${userEmail})`,
        link: '/history',
      });
      toast.success(`Подтверждено: ${userEmail}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка подтверждения');
    }
  };

  const handleReject = async (id: string, reason: string, userId: string, userEmail: string) => {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return toast.error('Укажите причину отклонения');

    try {
      await mutation.mutateAsync({ id, status: 'REJECTED', rejectedReason: trimmed });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Часы супервизии отклонены (${userEmail}). Причина: ${trimmed}`,
        link: '/history',
      });
      toast.success(`Отклонено: ${userEmail}`);
      setRejectedReasonMap((m) => ({ ...m, [id]: '' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка отклонения');
    }
  };

  if (queryStatus === 'pending') {
    return <div className="text-sm text-blue-dark">Загрузка…</div>;
  }
  if (!hours.length) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm text-gray-600"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Нет назначенных часов на проверку.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header в стиле CEU */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h3 className="text-lg font-semibold text-blue-dark">Супервизия — заявки на проверку</h3>
        <p className="text-sm text-gray-500">Всего: {hours.length}</p>
      </div>

      {/* Body с таблицей в том же стиле */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="p-2 whitespace-nowrap">Имя</th>
              <th className="p-2 whitespace-nowrap">Email</th>
              <th className="p-2 text-center whitespace-nowrap">Тип</th>
              <th className="p-2 text-center whitespace-nowrap">Часы</th>
              <th className="p-2 text-center whitespace-nowrap">Причина</th>
              <th className="p-2 text-center whitespace-nowrap">Действие</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr
                key={hour.id}
                className="border-t"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
                <td className="p-2">{hour.record.user.fullName}</td>
                <td className="p-2">{hour.record.user.email}</td>
                <td className="p-2 text-center">{typeMap[hour.type] ?? hour.type}</td>
                <td className="p-2 text-center">{hour.value}</td>
                <td className="p-2">
                  <div className="flex justify-center">
                    <input
                      type="text"
                      placeholder="Причина отклонения"
                      className="input w-44"
                      value={rejectedReasonMap[hour.id] ?? ''}
                      onChange={(e) =>
                        setRejectedReasonMap((prev) => ({ ...prev, [hour.id]: e.target.value }))
                      }
                      disabled={mutation.isPending}
                    />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() =>
                        handleConfirm(hour.id, hour.record.user.id, hour.record.user.email)
                      }
                      className="btn btn-brand"
                      disabled={mutation.isPending}
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() =>
                        handleReject(
                          hour.id,
                          rejectedReasonMap[hour.id],
                          hour.record.user.id,
                          hour.record.user.email,
                        )
                      }
                      className="btn btn-danger"
                      disabled={mutation.isPending}
                    >
                      Отклонить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div
          className="p-3 border-t flex justify-center"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <button className="btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Загружаем…' : 'Загрузить ещё'}
          </button>
        </div>
      )}
    </div>
  );
}
