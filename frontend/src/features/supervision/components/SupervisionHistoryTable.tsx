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

  if (isLoading) {
    return (
      <div className="rounded-2xl border header-shadow bg-white p-6 text-sm">
        Загрузка истории часов…
      </div>
    );
  }

  if (error || !data || !Array.isArray(data)) {
    console.error('Invalid supervision history data:', data);
    return (
      <div className="rounded-2xl border header-shadow bg-white p-6 text-error">
        Ошибка загрузки истории
      </div>
    );
  }

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
        <h2 className="text-xl font-semibold text-blue-dark">История супервизии</h2>
      </div>

      {/* Body */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
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
              <tr
                key={hour.id}
                className="border-t hover:bg-gray-50"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
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
