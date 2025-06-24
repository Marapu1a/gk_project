// src/features/supervision/components/SupervisionReviewForm.tsx
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { useState } from 'react';

export function SupervisionReviewForm() {
  const { data } = useAssignedHours();
  const mutation = useUpdateHourStatus();
  const [rejectedReasonMap, setRejectedReasonMap] = useState<Record<string, string>>({});

  const typeMap: Record<string, string> = {
    INSTRUCTOR: 'Инструктор',
    CURATOR: 'Куратор',
    SUPERVISOR: 'Супервизор',
    EXPERIENCED_SUPERVISOR: 'Опытный супервизор',
  };

  const handleReject = (id: string) => {
    mutation.mutate({
      id,
      status: 'REJECTED',
      rejectedReason: rejectedReasonMap[id] || '',
    });
  };

  const handleConfirm = (id: string) => {
    mutation.mutate({
      id,
      status: 'CONFIRMED',
    });
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-blue-soft">
          <tr>
            <th className="text-left p-3 border-b border-blue-dark/20">Имя</th>
            <th className="text-left p-3 border-b border-blue-dark/20">Email</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Тип</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Часы</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map((hour) => (
            <tr key={hour.id} className="hover:bg-gray-50">
              <td className="p-3">{hour.record.user.fullName}</td>
              <td className="p-3">{hour.record.user.email}</td>
              <td className="p-3 text-center">{typeMap[hour.type] || hour.type}</td>
              <td className="p-3 text-center">{hour.value}</td>
              <td className="p-3">
                <div className="flex flex-col items-center gap-2">
                  <input
                    type="text"
                    placeholder="Причина отклонения"
                    className="input w-48"
                    value={rejectedReasonMap[hour.id] || ''}
                    onChange={(e) =>
                      setRejectedReasonMap((prev) => ({ ...prev, [hour.id]: e.target.value }))
                    }
                  />
                  {!rejectedReasonMap[hour.id] && (
                    <p className="text-error text-xs italic mt-1">
                      Укажите причину перед отклонением
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(hour.id)}
                      className="btn"
                      style={{ backgroundColor: 'var(--color-green-dark)', color: 'white' }}
                      disabled={mutation.isPending}
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => handleReject(hour.id)}
                      className="btn"
                      style={{ backgroundColor: '#e3342f', color: 'white' }}
                      disabled={mutation.isPending || !rejectedReasonMap[hour.id]}
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
  );
}
