import { useCeuSummary } from '../hooks/useCeuSummary';
import { useCeuUnconfirmed } from '../hooks/useCeuUnconfirmed';

export function CeuSummaryBlock() {
  const { data: summary, isLoading: loadingSummary } = useCeuSummary();
  const { data: unconfirmed, isLoading: loadingUnconfirmed } = useCeuUnconfirmed();

  if (loadingSummary || loadingUnconfirmed) return <p>Загрузка CEU...</p>;
  if (!summary || !unconfirmed) return <p className="text-error">Ошибка загрузки CEU</p>;

  const categories = ['ethics', 'cultDiver', 'supervision', 'general'] as const;

  const categoryLabels: Record<(typeof categories)[number], string> = {
    ethics: 'Этика',
    cultDiver: 'Культурное разнообразие',
    supervision: 'Супервизия',
    general: 'Общие баллы',
  };

  return (
    <div className="space-y-2 text-sm">
      <h3 className="text-lg font-semibold text-blue-dark">CEU-баллы</h3>
      <table className="w-full border border-blue-dark/10 rounded-md overflow-hidden">
        <thead className="bg-blue-soft text-blue-dark text-left text-xs uppercase">
          <tr>
            <th className="p-2">Категория</th>
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
