// src/features/supervision/components/SupervisionHistoryTable.tsx
import { useSupervisionHistory } from '../hooks/useSupervisionHistory';
import { format } from 'date-fns';

const typeMap: Record<string, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const statusMap: Record<string, string> = {
  UNCONFIRMED: 'На проверке',
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
  SPENT: 'Потрачено',
};

export function SupervisionHistoryTable() {
  const { data, isLoading, error } = useSupervisionHistory();

  console.log('Supervision history raw data:', data);

  if (isLoading) return <p>Загрузка истории часов...</p>;
  if (error || !data || !Array.isArray(data)) {
    console.error('Invalid supervision history data:', data);
    return <p className="text-error">Ошибка загрузки истории</p>;
  }

  return (
    <div className="border p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2 text-blue-dark">История супервизии</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Тип</th>
            <th>Часы</th>
            <th>Статус</th>
            <th>Проверено</th>
            <th>Причина отклонения</th>
          </tr>
        </thead>
        <tbody>
          {data.map((hour) => (
            <tr key={hour.id}>
              <td className="text-center">{format(new Date(hour.createdAt), 'dd.MM.yyyy')}</td>
              <td className="text-center">{typeMap[hour.type]}</td>
              <td className="text-center">{hour.value}</td>
              <td className="text-center">{statusMap[hour.status]}</td>
              <td className="text-center">
                {hour.reviewedAt ? format(new Date(hour.reviewedAt), 'dd.MM.yyyy') : '—'}
              </td>
              <td className="text-center text-red-500">{hour.rejectedReason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
