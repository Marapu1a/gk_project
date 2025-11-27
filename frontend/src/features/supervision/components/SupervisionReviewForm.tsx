// src/features/supervision/components/SupervisionReviewForm.tsx
import { useState, useMemo } from 'react';
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { postNotification } from '@/features/notifications/api/notifications';
import { toast } from 'sonner';
import type { AssignedHourItem } from '../api/getAssignedHours';

type HourType = AssignedHourItem['type'];

const normalizeType = (t: HourType): 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' => {
  if (t === 'INSTRUCTOR') return 'PRACTICE';
  if (t === 'CURATOR') return 'SUPERVISION';
  return t;
};

const typeLabel: Record<'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR', string> = {
  PRACTICE: 'Практика',
  SUPERVISION: 'Супервизия',
  SUPERVISOR: 'Менторство',
};

// более точный текст для уведомлений
const notifLabel = (t: HourType) => {
  const nt = normalizeType(t);
  if (nt === 'SUPERVISOR') return 'менторские часы';
  if (nt === 'PRACTICE') return 'часы практики';
  return 'часы супервизии';
};

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

  const handleConfirm = async (id: string, type: HourType, userId: string, userEmail: string) => {
    try {
      await mutation.mutateAsync({ id, status: 'CONFIRMED' });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Ваши ${notifLabel(type)} подтверждены (${userEmail})`,
        link: '/history',
      });
      toast.success(`Подтверждено: ${userEmail}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка подтверждения');
    }
  };

  const handleReject = async (
    id: string,
    type: HourType,
    reason: string,
    userId: string,
    userEmail: string,
  ) => {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return toast.error('Укажите причину отклонения');

    try {
      await mutation.mutateAsync({ id, status: 'REJECTED', rejectedReason: trimmed });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Ваши ${notifLabel(type)} отклонены (${userEmail}). Причина: ${trimmed}`,
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
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h3 className="text-lg font-semibold text-blue-dark">Супервизия — заявки на проверку</h3>
        <p className="text-sm text-gray-500">Всего: {hours.length}</p>
      </div>

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
            {hours.map((hour) => {
              const t = normalizeType(hour.type);
              return (
                <tr
                  key={hour.id}
                  className="border-t"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="p-2">{hour.record.user.fullName}</td>
                  <td className="p-2">{hour.record.user.email}</td>
                  <td className="p-2 text-center">{typeLabel[t]}</td>
                  <td className="p-2 text-center">{hour.value}</td>
                  <td className="p-2">
                    <div className="flex justify-center">
                      <input
                        type="text"
                        placeholder="Причина отклонения"
                        className="input w-44"
                        value={rejectedReasonMap[hour.id] ?? ''}
                        onChange={(e) =>
                          setRejectedReasonMap((prev) => ({
                            ...prev,
                            [hour.id]: e.target.value,
                          }))
                        }
                        disabled={mutation.isPending}
                      />
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          handleConfirm(
                            hour.id,
                            hour.type,
                            hour.record.user.id,
                            hour.record.user.email,
                          )
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
                            hour.type,
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
              );
            })}
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
