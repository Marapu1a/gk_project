import { useCeuHistory } from '@/features/ceu/hooks/useCeuHistory';
import { format } from 'date-fns';

export function CeuHistoryTable() {
  const { data, isLoading, error } = useCeuHistory();

  if (isLoading) return <p>Загрузка истории баллов...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки истории</p>;

  return (
    <div className="border border-blue-dark/10 bg-white p-6 rounded-xl shadow-sm space-y-4">
      <h3 className="text-xl font-semibold text-blue-dark">История CEU-баллов</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
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
