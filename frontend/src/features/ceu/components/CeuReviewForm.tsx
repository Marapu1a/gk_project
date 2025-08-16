import { useState } from 'react';
import { postNotification } from '@/features/notifications/api/notifications';
import { useUpdateCEUEntry } from '../hooks/useUpdateCeuEntry';
import type { CEUReviewResponse } from '../hooks/useCeuRecordsByEmail';
import { toast } from 'sonner';

export function CeuReviewForm({ data }: { data: CEUReviewResponse }) {
  const updateMutation = useUpdateCEUEntry(data.user.id, data.user.email);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const handleStatusChange = async (
    entryId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED',
  ) => {
    const rejectedReason = reasons[entryId];

    if (status === 'REJECTED' && (!rejectedReason || rejectedReason.trim() === '')) {
      toast.error('Укажите причину отклонения.');
      return;
    }

    updateMutation.mutate(
      { id: entryId, status, rejectedReason },
      {
        onSuccess: async () => {
          const message =
            status === 'CONFIRMED'
              ? 'Ваши CEU-баллы подтверждены'
              : status === 'REJECTED'
                ? `Ваши CEU-баллы отклонены: ${rejectedReason}`
                : 'Статус CEU-баллов изменён';

          let notifFailed = false;
          try {
            await postNotification({
              userId: data.user.id,
              type: 'CEU',
              message,
              link: '/history',
            });
          } catch {
            notifFailed = true;
          } finally {
            toast.success(message);
            if (notifFailed)
              toast.info('Статус обновлён, но уведомление пользователю не отправилось.');
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || 'Не удалось обновить статус';
          toast.error(msg);
        },
      },
    );
  };

  const statusMap: Record<string, string> = {
    UNCONFIRMED: 'Ожидает проверки',
    CONFIRMED: 'Подтверждено',
    REJECTED: 'Отклонено',
    SPENT: 'Использовано',
  };

  const categoryMap: Record<string, string> = {
    ETHICS: 'Этика',
    CULTURAL_DIVERSITY: 'Культурное разнообразие',
    SUPERVISION: 'Супервизия',
    GENERAL: 'Общие',
  };

  return (
    <div className="space-y-6">
      {/* Карточка пользователя */}
      <div
        className="rounded-2xl border header-shadow bg-white p-6"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark mb-2">Пользователь</h2>
        <p className="text-sm">
          <strong>Имя:</strong> {data.user.fullName} <br />
          <strong>Email:</strong> {data.user.email}
        </p>
      </div>

      {data.records.length === 0 ? (
        <div
          className="rounded-2xl border header-shadow bg-white p-6 text-sm text-gray-600"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          Нет добавленных CEU-баллов
        </div>
      ) : (
        <div className="space-y-6">
          {data.records.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border header-shadow bg-white overflow-hidden"
              style={{ borderColor: 'var(--color-green-light)' }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
                <h3 className="text-lg font-semibold text-blue-dark">{record.eventName}</h3>
                <p className="text-sm text-gray-500">
                  Дата мероприятия: {new Date(record.eventDate).toLocaleDateString()}
                </p>
                <p className="text-sm">
                  <a
                    href={`/uploads/${record.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    Открыть файл подтверждения
                  </a>
                </p>
              </div>

              {/* Body */}
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ background: 'var(--color-blue-soft)' }}>
                      <th className="p-2 whitespace-nowrap">Категория</th>
                      <th className="p-2 text-center whitespace-nowrap">Баллы</th>
                      <th className="p-2 text-center whitespace-nowrap">Статус</th>
                      <th className="p-2 text-center whitespace-nowrap">Рецензент</th>
                      <th className="p-2 text-center whitespace-nowrap">Причина</th>
                      <th className="p-2 text-center whitespace-nowrap">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-t"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <td className="p-2">{categoryMap[entry.category] || entry.category}</td>
                        <td className="p-2 text-center">{entry.value}</td>
                        <td className="p-2 text-center">
                          {statusMap[entry.status] || entry.status}
                        </td>
                        <td className="p-2 text-center">{entry.reviewer?.email || '—'}</td>
                        <td className="p-2 text-center text-red-500">
                          {entry.rejectedReason || '—'}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <input
                              type="text"
                              placeholder="Причина"
                              className="input w-44"
                              value={reasons[entry.id] || ''}
                              onChange={(e) =>
                                setReasons((prev) => ({ ...prev, [entry.id]: e.target.value }))
                              }
                              disabled={updateMutation.isPending}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(entry.id, 'CONFIRMED')}
                                disabled={updateMutation.isPending || entry.status === 'CONFIRMED'}
                                className="btn btn-brand"
                              >
                                Подтвердить
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(entry.id, 'REJECTED')}
                                disabled={updateMutation.isPending}
                                className="btn btn-danger"
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
          ))}
        </div>
      )}
    </div>
  );
}
