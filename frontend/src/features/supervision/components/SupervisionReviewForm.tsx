// src/features/supervision/components/SupervisionReviewForm.tsx
import { useState, useMemo } from 'react';
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { toast } from 'sonner';
import type { AssignedHourItem } from '../api/getAssignedHours';

type HourType = AssignedHourItem['type'];

const normalizeType = (t: HourType): 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' | 'IMPLEMENTING' | 'PROGRAMMING' => {
  if (t === 'INSTRUCTOR' || t === 'PRACTICE') return 'PRACTICE';
  if (t === 'CURATOR' || t === 'SUPERVISION') return 'SUPERVISION';
  return t;
};

const typeLabel: Record<'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' | 'IMPLEMENTING' | 'PROGRAMMING', string> = {
  PRACTICE: 'Практика',
  SUPERVISION: 'Супервизия',
  SUPERVISOR: 'Менторство',
  IMPLEMENTING: 'Полевая практика',
  PROGRAMMING: 'Работа с информацией',
};

type ReviewRecord = {
  recordId: string;
  user: AssignedHourItem['record']['user'];
  hours: AssignedHourItem[];
  total: number;
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

  const records: ReviewRecord[] = useMemo(() => {
    const hours = data ? data.pages.flatMap((p) => p.hours) : [];
    const byRecord = new Map<string, ReviewRecord>();

    for (const hour of hours) {
      const recordId = hour.record.id;
      const existing = byRecord.get(recordId);

      if (existing) {
        existing.hours.push(hour);
        existing.total += hour.value;
      } else {
        byRecord.set(recordId, {
          recordId,
          user: hour.record.user,
          hours: [hour],
          total: hour.value,
        });
      }
    }

    return Array.from(byRecord.values()).map((record) => ({
      ...record,
      total: Math.round(record.total * 100) / 100,
    }));
  }, [data]);

  const handleConfirm = async (id: string, userEmail: string) => {
    try {
      await mutation.mutateAsync({ id, status: 'CONFIRMED' });
      toast.success(`Подтверждено: ${userEmail}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка подтверждения');
    }
  };

  const handleReject = async (
    id: string,
    reason: string,
    userEmail: string,
  ) => {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return toast.error('Укажите причину отклонения');

    try {
      await mutation.mutateAsync({ id, status: 'REJECTED', rejectedReason: trimmed });
      toast.success(`Отклонено: ${userEmail}`);
      setRejectedReasonMap((m) => ({ ...m, [id]: '' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка отклонения');
    }
  };

  if (queryStatus === 'pending') {
    return <div className="text-sm text-blue-dark">Загрузка…</div>;
  }
  if (!records.length) {
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
        <p className="text-sm text-gray-500">Всего: {records.length}</p>
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
            {records.map((record) => {
              const actionHourId = record.hours[0]?.id;
              return (
                <tr
                  key={record.recordId}
                  className="border-t"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="p-2">{record.user.fullName}</td>
                  <td className="p-2">{record.user.email}</td>
                  <td className="p-2 text-center">
                    <div className="space-y-1">
                      {record.hours.map((hour) => {
                        const t = normalizeType(hour.type);
                        return (
                          <div key={hour.id}>
                            {typeLabel[t]}: <strong>{hour.value}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-2 text-center font-semibold">{record.total}</td>
                  <td className="p-2">
                    <div className="flex justify-center">
                      <input
                        type="text"
                        placeholder="Причина отклонения"
                        className="input w-44"
                        value={rejectedReasonMap[record.recordId] ?? ''}
                        onChange={(e) =>
                          setRejectedReasonMap((prev) => ({
                            ...prev,
                            [record.recordId]: e.target.value,
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
                          actionHourId &&
                          handleConfirm(
                            actionHourId,
                            record.user.email,
                          )
                        }
                        className="btn btn-brand"
                        disabled={mutation.isPending || !actionHourId}
                      >
                        Подтвердить
                      </button>
                      <button
                        onClick={() =>
                          actionHourId &&
                          handleReject(
                            actionHourId,
                            rejectedReasonMap[record.recordId],
                            record.user.email,
                          )
                        }
                        className="btn btn-danger"
                        disabled={mutation.isPending || !actionHourId}
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
