// src/features/ceu/components/CeuSummaryBlock.tsx
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
    <div className="border p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2 text-blue-dark">CEU-баллы</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Категория</th>
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
