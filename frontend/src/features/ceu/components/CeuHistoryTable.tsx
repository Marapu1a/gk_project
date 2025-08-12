import { useCeuHistory } from '@/features/ceu/hooks/useCeuHistory';
import { format } from 'date-fns';

export function CeuHistoryTable() {
  const { data, isLoading, error } = useCeuHistory();

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Загрузка истории баллов...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-error"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
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
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h3 className="text-xl font-semibold text-blue-dark">История CEU-баллов</h3>
      </div>

      {/* Body */}
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-soft text-left text-sm font-medium">
              <th className="p-2">Мероприятие</th>
              <th className="p-2 text-center">Дата</th>
              <th className="p-2 text-center">Категория</th>
              <th className="p-2 text-center">Баллы</th>
              <th className="p-2 text-center">Статус</th>
              <th className="p-2 text-center">Причина отклонения</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-2">{entry.eventName}</td>
                <td className="p-2 text-center">
                  {format(new Date(entry.eventDate), 'dd.MM.yyyy')}
                </td>
                <td className="p-2 text-center">{categoryMap[entry.category]}</td>
                <td className="p-2 text-center">{entry.value}</td>
                <td className="p-2 text-center">
                  <span
                    className={
                      entry.status === 'CONFIRMED'
                        ? 'text-green-700'
                        : entry.status === 'REJECTED'
                          ? 'text-red-600'
                          : entry.status === 'SPENT'
                            ? 'text-gray-500 italic'
                            : 'text-yellow-700'
                    }
                  >
                    {statusMap[entry.status]}
                  </span>
                </td>
                <td className="p-2 text-center text-red-600">
                  {entry.status === 'REJECTED' ? entry.rejectedReason || '—' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const categoryMap: Record<string, string> = {
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
  GENERAL: 'Общие баллы',
};

const statusMap: Record<string, string> = {
  UNCONFIRMED: 'На проверке',
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
  SPENT: 'Потрачено',
};
