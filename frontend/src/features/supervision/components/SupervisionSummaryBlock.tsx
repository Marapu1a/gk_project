// src/features/supervision/components/SupervisionSummaryBlock.tsx
import { useSupervisionSummary } from '../hooks/useSupervisionSummary';
import { useSupervisionUnconfirmed } from '../hooks/useSupervisionUnconfirmed';

export function SupervisionSummaryBlock() {
  const { data: summary, isLoading: loadingSummary } = useSupervisionSummary();
  const { data: unconfirmed, isLoading: loadingUnconfirmed } = useSupervisionUnconfirmed();

  if (loadingSummary || loadingUnconfirmed) return <p>Загрузка часов супервизии...</p>;
  if (!summary || !unconfirmed) return <p className="text-error">Ошибка загрузки супервизии</p>;

  const categories = ['instructor', 'curator'] as const;

  const categoryLabels: Record<(typeof categories)[number], string> = {
    instructor: 'Инструктор',
    curator: 'Куратор',
  };

  return (
    <div className="border p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2 text-blue-dark">Часы супервизии</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Тип</th>
            <th>Требуется</th>
            <th>Доступно</th>
            <th>%</th>
            <th>На проверке</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat}>
              <td className="py-1">{categoryLabels[cat]}</td>
              <td className="text-center">{summary.required?.[cat] ?? '—'}</td>
              <td className="text-center">{summary.usable[cat]}</td>
              <td className="text-center">
                {summary.percent ? Math.min(summary.percent[cat], 100) : '—'}
              </td>
              <td className="text-center">{unconfirmed[cat]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
