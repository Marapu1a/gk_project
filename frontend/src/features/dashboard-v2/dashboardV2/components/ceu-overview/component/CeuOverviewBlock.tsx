import { useNavigate } from 'react-router-dom';
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import type { Level } from '@/features/ceu/api/getCeuSummary';

type CeuOverviewBlockProps = {
  level?: Level | null;
  showActions?: boolean;
};

type CategoryKey = 'ethics' | 'supervision' | 'cultDiver' | 'general';

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: 'ethics', label: 'Этика' },
  { key: 'supervision', label: 'Супервизия' },
  { key: 'cultDiver', label: 'Культурное разнообразие' },
  { key: 'general', label: 'Общие баллы' },
];

function formatNumber(value: number | null | undefined) {
  if (value == null) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function HelpBadge({ title }: { title: string }) {
  return (
    <span
      className="dashboard-v2-help"
      title={title}
      aria-label={title}
    />
  );
}

function CeuMetricCard({
  label,
  value,
  required,
}: {
  label: string;
  value: number;
  required: number;
}) {
  const isEmpty = value <= 0 && required <= 0;

  return (
    <div className="flex min-h-[80px] items-center justify-between gap-4 rounded-[10px] bg-[#E5EFF1] px-5 py-4">
      <span className="min-w-0 text-[16px] font-extrabold leading-[1.2] text-[#1F305E]">
        {label}
      </span>

      <span
        className={`shrink-0 whitespace-nowrap text-[22px] font-extrabold leading-none ${
          isEmpty ? 'text-[#A7B1C7]' : 'text-[#1F305E]'
        }`}
      >
        {formatNumber(value)}
        <span className="ml-1 text-[16px] font-medium text-[#7F8AA3]">/{formatNumber(required)}</span>
      </span>
    </div>
  );
}

export function CeuOverviewBlock({ level = null, showActions = true }: CeuOverviewBlockProps) {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError } = useCeuSummary(level);

  if (isLoading) {
    return (
      <section className="card-section">
        <p className="text-sm text-blue-dark">Загрузка CEU...</p>
      </section>
    );
  }

  if (isError || !summary) {
    return (
      <section className="card-section">
        <p className="text-sm text-error">Не удалось загрузить CEU-баллы</p>
      </section>
    );
  }

  const required = summary.required;

  return (
    <section className="card-section overflow-hidden px-5 py-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="dashboard-v2-title">CEU-Баллы</h3>
          <HelpBadge title="Подтвержденные CEU-баллы в текущем активном цикле." />
        </div>

        {showActions ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/ceu/points?panel=history')}
              className="btn dashboard-v2-action dashboard-v2-action-secondary"
            >
              История
            </button>

            <button
              type="button"
              onClick={() => navigate('/ceu/points?panel=add')}
              className="btn dashboard-v2-action dashboard-v2-action-primary"
            >
              Добавить
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((category) => (
          <CeuMetricCard
            key={category.key}
            label={category.label}
            value={summary.usable[category.key] ?? 0}
            required={required?.[category.key] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
