// src/features/ceu/components/CeuSummaryBlock.tsx
import { useCeuSummary } from '../hooks/useCeuSummary';

type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

type Props = {
  level?: Level | null;
};

export function CeuSummaryBlock({ level }: Props) {
  const { data: summary, isLoading: loadingSummary } = useCeuSummary(level ?? undefined);

  if (loadingSummary) {
    return <p className="text-sm text-blue-dark">Загрузка CEU…</p>;
  }
  if (!summary) {
    return <p className="text-error">Ошибка загрузки CEU</p>;
  }

  const categories = ['ethics', 'cultDiver', 'supervision', 'general'] as const;

  const categoryLabels: Record<(typeof categories)[number], string> = {
    ethics: 'Этика',
    cultDiver: 'Культурное разнообразие',
    supervision: 'Супервизия',
    general: 'Общие баллы',
  };

  const fmtPercent = (v?: number) => (typeof v === 'number' ? Math.min(Math.max(v, 0), 100) : 0);

  // Суммарное требуемое количество CEU по всем категориям
  const totalRequired =
    (summary.required?.ethics ?? 0) +
    (summary.required?.cultDiver ?? 0) +
    (summary.required?.supervision ?? 0) +
    (summary.required?.general ?? 0);

  // Для супервизоров/опытных супервизоров бэк теперь отдаёт 4+4+4+12 = 24
  const isContinuous24 = totalRequired === 24;

  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-lg font-semibold text-blue-dark">
        CEU-баллы
        {isContinuous24 && (
          <span className="ml-2 text-xs font-normal text-gray-700">
            (24 балла непрерывного образования)
          </span>
        )}
      </h3>

      <div
        className="overflow-x-auto rounded-2xl border"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="p-2 text-left">Категория</th>
              <th className="p-2 text-center">Требуется</th>
              <th className="p-2 text-center">Доступно</th>
              <th className="p-2 text-center">Прогресс</th>
              <th className="p-2 text-center">Всего начислено</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => {
              const requiredVal = summary.required?.[cat] ?? 0;
              const usableVal = summary.usable[cat];
              const totalVal = summary.total[cat];
              const percentValue = fmtPercent(summary.percent?.[cat]);

              return (
                <tr
                  key={cat}
                  className="border-t"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="p-2">{categoryLabels[cat]}</td>
                  <td className="p-2 text-center">{totalRequired > 0 ? requiredVal : '—'}</td>
                  <td className="p-2 text-center">{usableVal}</td>
                  <td className="p-2 text-center">
                    <div className="w-full max-w-[100px] mx-auto">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-green-light)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentValue}%`,
                            backgroundColor: 'var(--color-green-brand)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{percentValue}%</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">{totalVal > 0 ? totalVal : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
