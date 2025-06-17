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
    <div className="space-y-2 text-sm">
      <h3 className="text-lg font-semibold text-blue-dark">Часы супервизии</h3>
      <table className="w-full border border-blue-dark/10 rounded-md overflow-hidden">
        <thead className="bg-blue-soft text-blue-dark text-left text-xs uppercase">
          <tr>
            <th className="p-2">Тип</th>
            <th className="p-2 text-center">Требуется</th>
            <th className="p-2 text-center">Доступно</th>
            <th className="p-2 text-center">%</th>
            <th className="p-2 text-center">На проверке</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat} className="border-t border-blue-dark/10">
              <td className="p-2">{categoryLabels[cat]}</td>
              <td className="p-2 text-center">{summary.required?.[cat] ?? '—'}</td>
              <td className="p-2 text-center">{summary.usable[cat]}</td>
              <td className="p-2 text-center">
                {summary.percent ? Math.min(summary.percent[cat], 100) : '—'}
              </td>
              <td className="p-2 text-center">{unconfirmed[cat]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
