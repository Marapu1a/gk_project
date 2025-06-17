import { useState } from 'react';
import { useUpdateCEUEntry } from '../hooks/useUpdateCeuEntry';
import type { CEUReviewResponse } from '../hooks/useCeuRecordsByEmail';
import { BackButton } from '@/components/BackButton';

export function CeuReviewForm({ data }: { data: CEUReviewResponse }) {
  const updateMutation = useUpdateCEUEntry();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const handleStatusChange = (
    entryId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED',
  ) => {
    const rejectedReason = reasons[entryId];
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
      <div>
        <h2 className="text-xl font-semibold mb-2 text-blue-dark">Пользователь</h2>
        <p>
          <strong>Имя:</strong> {data.user.fullName} <br />
          <strong>Email:</strong> {data.user.email}
        </p>
      </div>

      {data.records.length === 0 ? (
        <p className="text-sm text-gray-600">Нет добавленных CEU-баллов</p>
      ) : (
        <div className="space-y-4">
          {data.records.map((record) => (
            <div key={record.id} className="border rounded-xl p-4 shadow-sm space-y-2">
              <h3 className="text-lg font-semibold">{record.eventName}</h3>
              <p className="text-sm text-gray-500">
                Дата: {new Date(record.eventDate).toLocaleDateString()}
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Категория</th>
                    <th>Баллы</th>
                    <th>Статус</th>
                    <th>Рецензент</th>
                    <th>Причина</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {record.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{categoryMap[entry.category] || entry.category}</td>
                      <td className="text-center">{entry.value}</td>
                      <td className="text-center">{statusMap[entry.status] || entry.status}</td>
                      <td className="text-center">{entry.reviewer?.email || '—'}</td>
                      <td className="text-center text-red-500">{entry.rejectedReason || '—'}</td>
                      <td className="text-center">
                        <div className="flex flex-col gap-1 items-center">
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
                            <button
                              className="btn btn-xs bg-green-600 text-white"
                              onClick={() => handleStatusChange(entry.id, 'CONFIRMED')}
                            >
                              Подтвердить
                            </button>
                            <button
                              className="btn btn-xs bg-red-600 text-white"
                              onClick={() => handleStatusChange(entry.id, 'REJECTED')}
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
          ))}
        </div>
      )}
      <BackButton />
    </div>
  );
}
