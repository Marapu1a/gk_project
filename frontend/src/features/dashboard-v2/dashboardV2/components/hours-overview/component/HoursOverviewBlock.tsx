import { useNavigate } from 'react-router-dom';
import { DashboardHelpTooltip } from '@/components/DashboardHelpTooltip';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getProgressPercent(current: number, required: number) {
  if (required <= 0) return 0;
  return Math.max(0, Math.min(100, (current / required) * 100));
}

function capToRequired(value: number, required?: number | null) {
  const current = Math.max(0, value);
  if (required == null || required <= 0) return current;
  return Math.min(current, required);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--color-blue-soft)] px-3 py-2.5">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="dashboard-v2-metric-label text-[#1F305E]">{label}</span>
        {hint ? <DashboardHelpTooltip content={hint} align="right" /> : null}
      </div>
      <div className="dashboard-v2-metric-value text-[#1F305E]">{value}</div>
    </div>
  );
}

function MetricSegment({
  label,
  value,
  side,
}: {
  label: string;
  value: string;
  side: 'left' | 'right';
}) {
  return (
    <div
      className={`bg-[var(--color-blue-soft)] px-3 py-2.5 ${
        side === 'left' ? 'rounded-l-[14px]' : 'rounded-r-[14px] border-l border-white'
      }`}
    >
      <div className="dashboard-v2-caption mb-1.5 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-metric-value text-[#1F305E]">{value}</div>
    </div>
  );
}

function MetricSegmentPair({
  leftValue,
  rightValue,
}: {
  leftValue: string;
  rightValue: string;
}) {
  return (
    <div className="grid grid-cols-2">
      <MetricSegment label="Индивидуально" value={leftValue} side="left" />
      <MetricSegment label="В группе" value={rightValue} side="right" />
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
    <div className="flex h-full min-h-[138px] flex-col items-center justify-center rounded-[16px] bg-[var(--color-blue-soft)] px-5 py-4">
      <span className="dashboard-v2-metric-label mb-4 text-[#1F305E]">{label}</span>
      <div
        className="relative flex h-[86px] w-[86px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#D8DFEA ${normalizedProgress}%, #FFFFFF ${normalizedProgress}% 100%)`,
        }}
      >
        <div className="absolute inset-[4px] rounded-full bg-[var(--color-blue-soft)]" />
        <div className="absolute inset-[8px] rounded-full border-[3px] border-[#D6DDEA] bg-white" />
        <span className="dashboard-v2-metric-value relative z-10 text-[#26396E]">{value}</span>
      </div>
    </div>
  );
}

type HoursOverviewBlockProps = {
  showActions?: boolean;
  forceMentorship?: boolean;
};

export function HoursOverviewBlock({
  showActions = true,
  forceMentorship = false,
}: HoursOverviewBlockProps) {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError } = useSupervisionSummary();

  if (isLoading) {
    return (
      <section className="card-section">
        <p className="dashboard-v2-text text-blue-dark">Загрузка часов...</p>
      </section>
    );
  }

  if (isError || !summary) {
    return (
      <section className="card-section">
        <p className="dashboard-v2-text text-error">Не удалось загрузить часы практики и супервизии</p>
      </section>
    );
  }

  const hasPracticeTrack =
    (summary.required?.practice ?? 0) > 0 ||
    summary.practiceBreakdown.total > 0 ||
    summary.pendingPracticeBreakdown.total > 0;

  const hasSupervisionTrack =
    (summary.required?.supervision ?? 0) > 0 || summary.supervisionBreakdown.total > 0;
  const hasMentorTrack =
    forceMentorship ||
    (summary.mentor?.required ?? 0) > 0 ||
    (summary.mentor?.total ?? 0) > 0 ||
    (summary.mentor?.pending ?? 0) > 0;

  if (!hasPracticeTrack && !hasSupervisionTrack && !hasMentorTrack) {
    return null;
  }

  if (hasMentorTrack && (forceMentorship || (!hasPracticeTrack && !hasSupervisionTrack))) {
    const mentor = summary.mentor ?? { total: 0, required: 24, percent: 0, pending: 0 };
    const mentorRemaining = Math.max(0, mentor.required - mentor.total - mentor.pending);
    const mentorDisplayTotal = capToRequired(mentor.total, mentor.required);

    return (
      <section className="card-section overflow-hidden px-5 py-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="dashboard-v2-title">Часы менторства</h3>
            <DashboardHelpTooltip content="Подтвержденные часы менторства в текущем активном цикле." />
          </div>

          {showActions ? (
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/supervision/hours?panel=history')}
                className="btn dashboard-v2-action dashboard-v2-action-secondary"
              >
                История
              </button>

              <button
                type="button"
                onClick={() => navigate('/supervision/hours')}
                className="btn dashboard-v2-action dashboard-v2-action-primary"
              >
                Добавить
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)]">
          <TotalCircle
            label="Всего"
            value={formatNumber(mentorDisplayTotal)}
            progress={mentor.percent}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Требуется"
              value={formatNumber(mentor.required)}
              hint="Фиксированное количество часов менторства для текущего цикла."
            />
            <MetricCard
              label="На рассмотрении"
              value={formatNumber(mentor.pending)}
              hint="Часы менторства, отправленные ментору и ожидающие проверки."
            />
            <MetricCard
              label="Осталось"
              value={formatNumber(mentorRemaining)}
              hint="Сколько часов менторства осталось отправить до выполнения условия."
            />
          </div>
        </div>
      </section>
    );
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
  const practiceDisplayTotal = capToRequired(
    summary.practiceBreakdown.total,
    summary.required?.practice,
  );
  const supervisionDisplayTotal = capToRequired(
    summary.supervisionBreakdown.total,
    summary.required?.supervision,
  );

  return (
    <section className="card-section overflow-hidden px-5 py-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)]">
        <div className="min-w-0">
          <div
            className={`mb-3 flex gap-2 ${
              showActions ? 'min-h-[40px] items-start' : 'items-center'
            }`}
          >
            <h3 className="dashboard-v2-title">Часы практики</h3>
            <DashboardHelpTooltip content="Подтвержденные часы практики в текущем активном цикле." />
          </div>

          <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Всего"
                value={formatNumber(practiceDisplayTotal)}
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
              <h3 className="dashboard-v2-title">Часы супервизии</h3>
              <DashboardHelpTooltip content="Распределите подтипы часов супервизии, чтобы увидеть разбивку по наблюдению и формату работы." />
            </div>

            {showActions ? (
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/supervision/hours?panel=history')}
                  className="btn dashboard-v2-action dashboard-v2-action-secondary"
                >
                  История
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/supervision/hours')}
                  className="btn dashboard-v2-action dashboard-v2-action-primary"
                >
                  Добавить
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[146px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Всего"
                value={formatNumber(supervisionDisplayTotal)}
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
                <MetricSegmentPair
                  leftValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.directIndividual : null,
                  )}
                  rightValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.directGroup : null,
                  )}
                />

                <MetricSegmentPair
                  leftValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObservingIndividual : null,
                  )}
                  rightValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObservingGroup : null,
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
