import { useNavigate } from 'react-router-dom';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getProgressPercent(current: number, required: number) {
  if (required <= 0) return 0;
  return Math.max(0, Math.min(100, (current / required) * 100));
}

function HelpBadge({ title }: { title: string }) {
  return (
    <span
      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: '#A7B1C7' }}
      title={title}
      aria-label={title}
    >
      ?
    </span>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] bg-[#E7F1F4] px-3 py-2.5">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="text-[14px] leading-[1.2] text-[#1F305E]">{label}</span>
        {hint ? <HelpBadge title={hint} /> : null}
      </div>
      <div className="text-[18px] font-extrabold leading-none text-[#1F305E]">{value}</div>
    </div>
  );
}

function TotalCircle({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex h-full min-h-[138px] flex-col items-center justify-center rounded-[16px] bg-[#E7F1F4] px-5 py-4">
      <span className="mb-4 text-[14px] text-[#1F305E]">{label}</span>
      <div
        className="relative flex h-[86px] w-[86px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#D8DFEA ${normalizedProgress}%, #FFFFFF ${normalizedProgress}% 100%)`,
        }}
      >
        <div className="absolute inset-[4px] rounded-full bg-[#E7F1F4]" />
        <div className="absolute inset-[8px] rounded-full border-[3px] border-[#D6DDEA] bg-white" />
        <span className="relative z-10 text-[18px] font-extrabold text-[#26396E]">{value}</span>
      </div>
    </div>
  );
}

export function HoursOverviewBlock() {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError } = useSupervisionSummary();

  if (isLoading) {
    return (
      <section className="card-section">
        <p className="text-sm text-blue-dark">Загрузка часов...</p>
      </section>
    );
  }

  if (isError || !summary) {
    return (
      <section className="card-section">
        <p className="text-sm text-error">Не удалось загрузить часы практики и супервизии</p>
      </section>
    );
  }

  const hasPracticeTrack =
    (summary.required?.practice ?? 0) > 0 ||
    summary.practiceBreakdown.total > 0 ||
    summary.pendingPracticeBreakdown.total > 0;

  const hasSupervisionTrack =
    (summary.required?.supervision ?? 0) > 0 || summary.supervisionBreakdown.total > 0;

  if (!hasPracticeTrack && !hasSupervisionTrack) {
    return null;
  }

  const fieldPractice = summary.practiceBreakdown.legacy + summary.practiceBreakdown.implementing;
  const infoPractice = summary.practiceBreakdown.programming;

  const hasDistribution = summary.distribution !== null;
  const practiceProgress = getProgressPercent(
    summary.practiceBreakdown.total,
    summary.required?.practice ?? 0,
  );
  const supervisionProgress = getProgressPercent(
    summary.supervisionBreakdown.total,
    summary.required?.supervision ?? 0,
  );

  return (
    <section className="card-section overflow-hidden px-5 py-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[18px] font-extrabold text-[#1F305E]">Часы практики</h3>
            <HelpBadge title="Подтвержденные часы практики в текущем активном цикле." />
          </div>

          <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Всего"
                value={formatNumber(summary.practiceBreakdown.total)}
                progress={practiceProgress}
              />
            </div>

            <div className="grid h-full grid-rows-2 gap-3">
              <MetricCard
                label="Полевая практика"
                value={formatNumber(fieldPractice)}
                hint="Временно включает старые записи практики без подтипов и новый подтип практики."
              />

              <MetricCard
                label="Работа с информацией"
                value={formatNumber(infoPractice)}
                hint="Подтвержденные часы практики по соответствующему подтипу."
              />
            </div>
          </div>
        </div>

        <div
          className="min-w-0 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"
          style={{ borderColor: 'rgba(31,48,94,0.14)' }}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[18px] font-extrabold text-[#1F305E]">Часы супервизии</h3>
              <HelpBadge title="Распределите подтипы часов супервизии, чтобы увидеть разбивку по наблюдению и формату работы." />
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn h-[40px] min-w-[132px] rounded-[14px] border border-[var(--color-blue-dark)] px-5 text-[16px] font-semibold text-blue-dark hover:bg-[rgba(31,48,94,0.04)] active:bg-[rgba(31,48,94,0.08)]"
              >
                История
              </button>

              <button
                type="button"
                onClick={() => navigate('/supervision/create')}
                className="btn btn-dark h-[40px] min-w-[132px] rounded-[14px] px-5 text-[16px] font-semibold"
              >
                Добавить
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[146px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Всего"
                value={formatNumber(summary.supervisionBreakdown.total)}
                progress={supervisionProgress}
              />
            </div>

            <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="С наблюдением"
                  value={formatNumber(hasDistribution ? summary.supervisionBreakdown.direct : null)}
                  hint="Сумма индивидуальной и групповой супервизии с наблюдением."
                />

                <MetricCard
                  label="Без наблюдения"
                  value={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObserving : null,
                  )}
                  hint="Сумма индивидуальной и групповой супервизии без наблюдения."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="Индивидуально"
                    value={formatNumber(
                      hasDistribution ? summary.supervisionBreakdown.directIndividual : null,
                    )}
                  />

                  <MetricCard
                    label="В группе"
                    value={formatNumber(
                      hasDistribution ? summary.supervisionBreakdown.directGroup : null,
                    )}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="Индивидуально"
                    value={formatNumber(
                      hasDistribution ? summary.supervisionBreakdown.nonObservingIndividual : null,
                    )}
                  />

                  <MetricCard
                    label="В группе"
                    value={formatNumber(
                      hasDistribution ? summary.supervisionBreakdown.nonObservingGroup : null,
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
