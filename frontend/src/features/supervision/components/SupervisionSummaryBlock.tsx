import { useSupervisionSummary } from '../hooks/useSupervisionSummary';
import { useSupervisionUnconfirmed } from '../hooks/useSupervisionUnconfirmed';

type Props = {
  user: {
    role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
    activeGroup?: {
      name: string;
    };
  };
};

export function SupervisionSummaryBlock({ user }: Props) {
  const { data: summary, isLoading: loadingSummary } = useSupervisionSummary();
  const { data: unconfirmed, isLoading: loadingUnconfirmed } = useSupervisionUnconfirmed();

  const activeGroup = user.activeGroup?.name;
  const isSupervisor = activeGroup === 'Супервизор';
  const isSeniorSupervisor = activeGroup === 'Опытный Супервизор';

  if (loadingSummary || loadingUnconfirmed) return <p>Загрузка часов супервизии...</p>;
  if (!summary || !unconfirmed) return <p className="text-error">Ошибка загрузки супервизии</p>;

  // === Опытный супервизор ===
  if (isSeniorSupervisor) {
    return (
      <div className="space-y-2 text-sm">
        <h3 className="text-lg font-semibold text-blue-dark">
          Можно тут какой-то полезный текст вставить вместо часов
        </h3>
        <p>Какой-то полезный текст, таблица, что угодно</p>
      </div>
    );
  }

  // === Супервизор (первогодка) ===
  if (isSupervisor) {
    return (
      <div className="space-y-2 text-sm">
        <h3 className="text-lg font-semibold text-blue-dark">Часы менторства</h3>
        <table className="w-full border border-blue-dark/10 rounded-md overflow-hidden">
          <thead className="bg-blue-soft text-blue-dark text-left text-xs uppercase">
            <tr>
              <th className="p-2 text-center">Всего</th>
              <th className="p-2 text-center">На проверке</th>
              {/* <th className="p-2 text-center">Прогресс</th> */}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-blue-dark/10">
              <td className="p-2 text-center">
                {Math.min(summary.usable.supervisor, summary.required?.supervisor ?? Infinity)} /{' '}
                {summary.required?.supervisor ?? '—'}
              </td>
              <td className="p-2 text-center">{unconfirmed.supervisor}</td>
              {/* <td className="p-2 text-center">{summary.percent?.supervisor ?? 0}%</td> */}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // === Все остальные ===
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
            <th className="p-2 text-center">Всего</th>
            <th className="p-2 text-center">На проверке</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat} className="border-t border-blue-dark/10">
              <td className="p-2">{categoryLabels[cat]}</td>
              <td className="p-2 text-center">
                {Math.min(summary.usable[cat], summary.required?.[cat] ?? Infinity)} /{' '}
                {summary.required?.[cat] ?? '—'}
              </td>
              <td className="p-2 text-center">{unconfirmed[cat]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
