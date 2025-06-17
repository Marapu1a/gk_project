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

  if (isLoading) return <p>Загрузка истории часов...</p>;
  if (error || !data || !Array.isArray(data)) {
    console.error('Invalid supervision history data:', data);
    return <p className="text-error">Ошибка загрузки истории</p>;
  }

  return (
    <div className="border border-blue-dark/10 bg-white p-6 rounded-xl shadow-sm space-y-4">
      <h3 className="text-xl font-semibold text-blue-dark">История супервизии</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-blue-soft text-sm font-medium">
              <th className="p-2 text-center">Дата</th>
              <th className="p-2 text-center">Тип</th>
              <th className="p-2 text-center">Часы</th>
              <th className="p-2 text-center">Статус</th>
              <th className="p-2 text-center">Проверено</th>
              <th className="p-2 text-center">Причина отклонения</th>
            </tr>
          </thead>
          <tbody>
            {data.map((hour) => (
              <tr key={hour.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-2 text-center">
                  {format(new Date(hour.createdAt), 'dd.MM.yyyy')}
                </td>
                <td className="p-2 text-center">{typeMap[hour.type]}</td>
                <td className="p-2 text-center">{hour.value}</td>
                <td className="p-2 text-center">
                  <span
                    className={
                      hour.status === 'CONFIRMED'
                        ? 'text-green-700'
                        : hour.status === 'REJECTED'
                          ? 'text-red-600'
                          : hour.status === 'SPENT'
                            ? 'text-gray-500 italic'
                            : 'text-yellow-700'
                    }
                  >
                    {statusMap[hour.status]}
                  </span>
                </td>
                <td className="p-2 text-center">
                  {hour.reviewedAt ? format(new Date(hour.reviewedAt), 'dd.MM.yyyy') : '—'}
                </td>
                <td className="p-2 text-center text-red-600">
                  {hour.status === 'REJECTED' ? hour.rejectedReason || '—' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
