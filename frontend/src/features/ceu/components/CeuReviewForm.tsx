import { useState } from 'react';
import { useUpdateCEUEntry } from '../hooks/useUpdateCeuEntry';
import type { CEUReviewResponse } from '../hooks/useCeuRecordsByEmail';
import { Button } from '@/components/Button';

export function CeuReviewForm({ data }: { data: CEUReviewResponse }) {
  const updateMutation = useUpdateCEUEntry();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const backendUrl = import.meta.env.VITE_API_URL;

  const handleStatusChange = (
    entryId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED',
  ) => {
    const rejectedReason = reasons[entryId];

    if (status === 'REJECTED' && (!rejectedReason || rejectedReason.trim() === '')) {
      alert('Пожалуйста, укажите причину отклонения.');
      return;
    }

    updateMutation.mutate({ id: entryId, status, rejectedReason });
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
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-blue-dark">Пользователь</h2>
        <p>
          <strong>Имя:</strong> {data.user.fullName} <br />
          <strong>Email:</strong> {data.user.email}
        </p>
      </div>

      {data.records.length === 0 ? (
        <p className="text-sm text-gray-600">Нет добавленных CEU-баллов</p>
      ) : (
        <div className="space-y-6">
          {data.records.map((record) => (
            <div key={record.id} className="border rounded-xl p-4 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{record.eventName}</h3>
                <p className="text-sm text-gray-500">
                  Дата: {new Date(record.eventDate).toLocaleDateString()}
                </p>
                <p className="text-sm">
                  <a
                    href={`${backendUrl}/uploads/${record.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    Открыть файл подтверждения
                  </a>
                </p>
              </div>

              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="text-left border-b">
                    <th className="whitespace-nowrap py-2">Категория</th>
                    <th className="text-center whitespace-nowrap">Баллы</th>
                    <th className="text-center whitespace-nowrap">Статус</th>
                    <th className="text-center whitespace-nowrap">Рецензент</th>
                    <th className="text-center whitespace-nowrap">Причина</th>
                    <th className="text-center whitespace-nowrap">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {record.entries.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="py-2">{categoryMap[entry.category] || entry.category}</td>
                      <td className="text-center">{entry.value}</td>
                      <td className="text-center">{statusMap[entry.status] || entry.status}</td>
                      <td className="text-center">{entry.reviewer?.email || '—'}</td>
                      <td className="text-center text-red-500">{entry.rejectedReason || '—'}</td>
                      <td className="text-center py-2">
                        <div className="flex flex-col gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Причина"
                            className="input input-sm w-40"
                            value={reasons[entry.id] || ''}
                            onChange={(e) =>
                              setReasons((prev) => ({ ...prev, [entry.id]: e.target.value }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => handleStatusChange(entry.id, 'CONFIRMED')}
                              loading={updateMutation.isPending}
                              className="btn btn-xs bg-green-600 text-white hover:bg-green-700"
                            >
                              Подтвердить
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleStatusChange(entry.id, 'REJECTED')}
                              loading={updateMutation.isPending}
                              className="btn btn-xs bg-red-600 text-white hover:bg-red-700"
                            >
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
