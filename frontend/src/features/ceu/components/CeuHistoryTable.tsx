// src/features/history/components/HistoryTable.tsx
import { useCeuHistory } from '@/features/ceu/hooks/useCeuHistory';
import { format } from 'date-fns';

export function CeuHistoryTable() {
  const { data, isLoading, error } = useCeuHistory();

  if (isLoading) return <p>Загрузка истории баллов...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки истории</p>;

  return (
    <div className="border p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2 text-blue-dark">История CEU-баллов</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Мероприятие</th>
            <th>Дата</th>
            <th>Категория</th>
            <th>Баллы</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id}>
              <td className="py-1">{entry.eventName}</td>
              <td className="text-center">{format(new Date(entry.eventDate), 'dd.MM.yyyy')}</td>
              <td className="text-center">{categoryMap[entry.category]}</td>
              <td className="text-center">{entry.value}</td>
              <td className="text-center">{statusMap[entry.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
