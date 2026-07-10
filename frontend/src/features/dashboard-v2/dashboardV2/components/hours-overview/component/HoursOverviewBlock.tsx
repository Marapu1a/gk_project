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

function isRequirementComplete(current: number, required?: number | null) {
  return required != null && required > 0 && current >= required;
}

function MetricCard({
  label,
  value,
  hint,
  compact = false,
  complete = false,
}: {
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
  complete?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] bg-[var(--color-blue-soft)] px-3 ${
        compact ? 'py-3' : 'py-2.5'
      } ${complete ? 'dashboard-v2-metric-complete' : ''}`}
    >
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
  complete = false,
}: {
  label: string;
  value: string;
  side: 'left' | 'right';
  complete?: boolean;
}) {
  return (
    <div
      className={`bg-[var(--color-blue-soft)] px-3 py-2.5 ${
        side === 'left' ? 'rounded-l-[14px]' : 'rounded-r-[14px] border-l border-white'
      } ${complete ? 'dashboard-v2-metric-complete' : ''}`}
    >
      <div className="dashboard-v2-caption mb-1.5 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-metric-value text-[#1F305E]">{value}</div>
    </div>
  );
}

function MetricSegmentPair({
  leftValue,
  rightValue,
  complete = false,
}: {
  leftValue: string;
  rightValue: string;
  complete?: boolean;
}) {
  return (
    <div className="grid grid-cols-2">
      <MetricSegment label="Индивидуально" value={leftValue} side="left" complete={complete} />
      <MetricSegment label="В группе" value={rightValue} side="right" complete={complete} />
    </div>
  );
}

function TotalCircle({
  label,
  value,
  progress,
  complete = false,
  compact = false,
}: {
  label: string;
  value: string;
  progress: number;
  complete?: boolean;
  compact?: boolean;
}) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const sizeClass = compact ? 'h-[76px] w-[76px]' : 'h-[86px] w-[86px]';
  const innerInset = compact ? 'inset-[7px]' : 'inset-[8px]';

  return (
    <div
      className={`flex h-full flex-col items-center justify-center rounded-[16px] bg-[var(--color-blue-soft)] px-5 ${
        compact ? 'min-h-[112px] py-3' : 'min-h-[138px] py-4'
      } ${complete ? 'dashboard-v2-total-complete' : ''}`}
    >
      <span className={`dashboard-v2-metric-label text-[#1F305E] ${compact ? 'mb-2.5' : 'mb-4'}`}>
        {label}
      </span>
      <div
        className={`relative flex ${sizeClass} items-center justify-center rounded-full`}
        style={{
          background: `conic-gradient(${
            complete ? 'var(--color-green-brand)' : '#D8DFEA'
          } ${normalizedProgress}%, #FFFFFF ${normalizedProgress}% 100%)`,
        }}
      >
        <div className="dashboard-v2-total-circle-inner absolute inset-[4px] rounded-full bg-[var(--color-blue-soft)]" />
        <div
          className={`absolute ${innerInset} rounded-full border-[3px] ${
            complete ? 'border-[var(--color-green-light)]' : 'border-[#D6DDEA]'
          } bg-white`}
        />
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
        <p className="dashboard-v2-text text-error">
          Не удалось загрузить часы практики и супервизии
        </p>
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
    const isMentorComplete = isRequirementComplete(mentor.total, mentor.required);

    return (
      <section className="card-section overflow-hidden px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="dashboard-v2-title">Часы менторства</h3>
            <DashboardHelpTooltip
              content={`Подтвержденные часы менторства в текущем активном цикле. Для сертификации необходимо ${formatNumber(mentor.required)} часов.`}
            />
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

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[136px_minmax(0,1fr)]">
          <TotalCircle
            label="Набрано"
            value={formatNumber(mentorDisplayTotal)}
            progress={mentor.percent}
            complete={isMentorComplete}
            compact
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard
              label="На рассмотрении"
              value={formatNumber(mentor.pending)}
              hint="Часы менторства, отправленные ментору и ожидающие проверки."
              compact
            />
            <MetricCard
              label="Осталось набрать"
              value={formatNumber(mentorRemaining)}
              hint="Сколько часов менторства осталось отправить до выполнения условия."
              compact
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
  const isPracticeComplete = isRequirementComplete(
    summary.practiceBreakdown.total,
    summary.required?.practice,
  );
  const isSupervisionComplete = isRequirementComplete(
    summary.supervisionBreakdown.total,
    summary.required?.supervision,
  );

  return (
    <section className="card-section overflow-hidden px-5 py-5">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)]">
        <div className="min-w-0">
          <div
            className={`mb-3 flex gap-2 ${
              showActions ? 'min-h-[40px] items-start' : 'items-center'
            }`}
          >
            <h3 className="dashboard-v2-title">Часы практики</h3>
            <DashboardHelpTooltip content="Подтвержденные часы практики для текущего уровня сертификации." />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Набрано"
                value={formatNumber(practiceDisplayTotal)}
                progress={practiceProgress}
                complete={isPracticeComplete}
              />
            </div>

            <div className="grid h-full grid-rows-2 gap-3">
              <MetricCard
                label="Полевая практика"
                value={formatNumber(fieldPractice)}
                hint="Часы прямой практической работы и взаимодействия с клиентами, родителями, коллегами и тп."
                complete={isPracticeComplete}
              />

              <MetricCard
                label="Работа с информацией"
                value={formatNumber(infoPractice)}
                hint="Часы практики, посвященные работе с информацией."
                complete={isPracticeComplete}
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
              <DashboardHelpTooltip content="Часы супервизии рассчитанные на основе подтвержденных супервизором часов практики." />
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

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[146px_minmax(0,1fr)]">
            <div>
              <TotalCircle
                label="Набрано"
                value={formatNumber(supervisionDisplayTotal)}
                progress={supervisionProgress}
                complete={isPracticeComplete || isSupervisionComplete}
              />
            </div>

            <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard
                  label="С наблюдением"
                  value={formatNumber(hasDistribution ? summary.supervisionBreakdown.direct : null)}
                  hint="Сумма индивидуальной и групповой супервизии с наблюдением."
                  complete={isPracticeComplete || isSupervisionComplete}
                />

                <MetricCard
                  label="Без наблюдения"
                  value={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObserving : null,
                  )}
                  hint="Сумма индивидуальной и групповой супервизии без наблюдения."
                  complete={isPracticeComplete || isSupervisionComplete}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricSegmentPair
                  leftValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.directIndividual : null,
                  )}
                  rightValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.directGroup : null,
                  )}
                  complete={isPracticeComplete || isSupervisionComplete}
                />

                <MetricSegmentPair
                  leftValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObservingIndividual : null,
                  )}
                  rightValue={formatNumber(
                    hasDistribution ? summary.supervisionBreakdown.nonObservingGroup : null,
                  )}
                  complete={isPracticeComplete || isSupervisionComplete}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
