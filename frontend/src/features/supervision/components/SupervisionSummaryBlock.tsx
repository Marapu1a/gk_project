import { useSupervisionSummary } from '../hooks/useSupervisionSummary';
import { useSupervisionUnconfirmed } from '../hooks/useSupervisionUnconfirmed';

type Props = {
  user: {
    role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
    activeGroup?: { name: string };
  };
};

export function SupervisionSummaryBlock({ user }: Props) {
  const { data: summary, isLoading: loadingSummary } = useSupervisionSummary();
  const { data: unconfirmed, isLoading: loadingUnconfirmed } = useSupervisionUnconfirmed();

  const activeGroup = user.activeGroup?.name;
  const isSupervisor = activeGroup === 'Супервизор';
  const isSeniorSupervisor = activeGroup === 'Опытный Супервизор';

  if (loadingSummary || loadingUnconfirmed) {
    return <p className="text-sm text-blue-dark">Загрузка часов супервизии…</p>;
  }
  if (!summary || !unconfirmed) {
    return <p className="text-error">Ошибка загрузки супервизии</p>;
  }

  // helper: прогрессбар
  const Bar = ({ percent }: { percent: number }) => {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    return (
      <div className="w-full max-w-[120px] mx-auto">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-green-light)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${p}%`,
              backgroundColor: p >= 100 ? 'var(--color-green-dark)' : 'var(--color-green-brand)',
            }}
          />
        </div>
        <span className="text-xs text-gray-600">{p}%</span>
      </div>
    );
  };

  // === Опытный супервизор ===
  if (isSeniorSupervisor) {
    return (
      <div className="space-y-3 text-sm">
        <h3 className="text-lg font-semibold text-blue-dark">Менторство / опыт</h3>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
          <p>
            Здесь можно показать полезную сводку для опытных супервизоров: метрики, напоминания,
            ссылки на проверки и т.п.
          </p>
        </div>
      </div>
    );
  }

  // === Супервизор (первогодка): считаем прогресс к требованию по mentor/supervisor ===
  if (isSupervisor) {
    const req = summary.required?.supervisor ?? 0;
    const usable = summary.usable.supervisor ?? 0;
    const used = Math.min(usable, req || Infinity);
    const percent = req ? (used / req) * 100 : 0;

    return (
      <div className="space-y-3 text-sm">
        <h3 className="text-lg font-semibold text-blue-dark">Часы менторства</h3>

        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                <th className="p-2 text-center">Всего</th>
                <th className="p-2 text-center">Прогресс</th>
                <th className="p-2 text-center">На проверке</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t" style={{ borderColor: 'var(--color-green-light)' }}>
                <td className="p-2 text-center">{req ? `${used} / ${req}` : `${usable} / —`}</td>
                <td className="p-2 text-center">
                  <Bar percent={percent} />
                </td>
                <td className="p-2 text-center">
                  {unconfirmed.supervisor > 0 ? unconfirmed.supervisor : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // === Все остальные: Инструктор / Куратор ===
  const categories = ['instructor', 'curator'] as const;
  const categoryLabels: Record<(typeof categories)[number], string> = {
    instructor: 'Инструктор',
    curator: 'Куратор',
  };

  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-lg font-semibold text-blue-dark">Часы супервизии</h3>

      <div
        className="overflow-x-auto rounded-2xl border"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="p-2 text-left">Тип</th>
              <th className="p-2 text-center">Всего</th>
              <th className="p-2 text-center">Прогресс</th>
              <th className="p-2 text-center">На проверке</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const req = summary.required?.[cat] ?? 0;
              const usable = summary.usable[cat] ?? 0;
              const used = Math.min(usable, req || Infinity);
              const percent = req ? (used / req) * 100 : 0;

              return (
                <tr
                  key={cat}
                  className="border-t"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="p-2">{categoryLabels[cat]}</td>
                  <td className="p-2 text-center">{req ? `${used} / ${req}` : `${usable} / —`}</td>
                  <td className="p-2 text-center">
                    <Bar percent={percent} />
                  </td>
                  <td className="p-2 text-center">
                    {unconfirmed[cat] > 0 ? unconfirmed[cat] : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
