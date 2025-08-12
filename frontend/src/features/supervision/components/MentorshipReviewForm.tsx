import { useState } from 'react';
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { useCreateNotification } from '@/features/notifications/hooks/useNotifications';
import { toast } from 'sonner';

export function MentorshipReviewForm() {
  const { data, isLoading, error } = useAssignedHours();
  const mutation = useUpdateHourStatus();
  const createNotification = useCreateNotification();
  const [rejectedReasonMap, setRejectedReasonMap] = useState<Record<string, string>>({});

  // confirm через тост (замена window.confirm)
  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Загрузка…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-error"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Ошибка загрузки данных
      </div>
    );
  }

  const mentorshipHours = data.filter((h) => h.type === 'SUPERVISOR');
  if (mentorshipHours.length === 0) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm text-gray-600"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Нет часов менторства для проверки.
      </div>
    );
  }

  const handleReject = async (id: string, userId: string) => {
    const reason = (rejectedReasonMap[id] || '').trim();
    if (!reason) {
      toast.error('Укажите причину отклонения.');
      return;
    }
    if (!(await confirmToast('Отклонить заявку на менторство?'))) return;

    mutation.mutate(
      { id, status: 'REJECTED', rejectedReason: reason },
      {
        onSuccess: () => {
          // уведомление пользователю (не валим поток при сбое)
          createNotification.mutate(
            {
              userId,
              type: 'MENTORSHIP',
              message: `Заявка на менторство отклонена: ${reason}`,
            },
            {
              onSettled: (_, err) => {
                toast.success('Заявка отклонена');
                if (err) toast.info('Статус обновлён, но уведомление не доставлено.');
              },
            },
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || 'Не удалось отклонить заявку';
          toast.error(msg);
        },
      },
    );
  };

  const handleConfirm = async (id: string, userId: string) => {
    if (!(await confirmToast('Подтвердить часы менторства?'))) return;

    mutation.mutate(
      { id, status: 'CONFIRMED' },
      {
        onSuccess: () => {
          createNotification.mutate(
            {
              userId,
              type: 'MENTORSHIP',
              message: 'Заявка на менторство подтверждена',
            },
            {
              onSettled: (_, err) => {
                toast.success('Заявка подтверждена');
                if (err) toast.info('Подтвердили, но уведомление не доставлено.');
              },
            },
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || 'Не удалось подтвердить заявку';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">Проверка часов менторства</h2>
      </div>

      {/* Body */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="p-3 text-left">Имя</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Часы</th>
              <th className="p-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            {mentorshipHours.map((hour) => (
              <tr
                key={hour.id}
                className="border-t hover:bg-gray-50"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
                <td className="p-3">{hour.record.user.fullName}</td>
                <td className="p-3">{hour.record.user.email}</td>
                <td className="p-3 text-center">{hour.value}</td>
                <td className="p-3">
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="text"
                      placeholder="Причина отклонения"
                      className="input w-48"
                      value={rejectedReasonMap[hour.id] || ''}
                      onChange={(e) =>
                        setRejectedReasonMap((prev) => ({
                          ...prev,
                          [hour.id]: e.target.value,
                        }))
                      }
                      disabled={mutation.isPending}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(hour.id, hour.record.user.id)}
                        className="btn btn-brand disabled:opacity-50"
                        disabled={mutation.isPending}
                      >
                        Подтвердить
                      </button>
                      <button
                        onClick={() => handleReject(hour.id, hour.record.user.id)}
                        className="btn btn-danger disabled:opacity-50"
                        disabled={mutation.isPending || !rejectedReasonMap[hour.id]?.trim()}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
