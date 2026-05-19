import type { ReviewerCandidateDetailsResponse } from '../../api/getReviewerCandidateDetails';

type CandidateHoursOverviewCardProps = {
  summary: ReviewerCandidateDetailsResponse['supervisionSummary'];
  mode?: 'supervision' | 'mentorship';
};

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
      className="dashboard-v2-help"
      title={title}
      aria-label={title}
    />
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="dashboard-v2-metric-label text-[#1F305E]">{label}</span>
        {hint ? <HelpBadge title={hint} /> : null}
      </div>
      <div className="dashboard-v2-metric-value-lg text-[#1F305E]">{value}</div>
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
      className={`bg-[var(--color-blue-soft)] px-4 py-3 ${
        side === 'left' ? 'rounded-l-[12px]' : 'rounded-r-[12px] border-l border-white'
      }`}
    >
      <div className="dashboard-v2-caption mb-2 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-metric-value-lg text-[#1F305E]">{value}</div>
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
    <div className="flex h-full min-h-[176px] flex-col items-center justify-center rounded-[12px] bg-[var(--color-blue-soft)] px-5 py-5">
      <span className="dashboard-v2-metric-label mb-5 text-[#1F305E]">{label}</span>
      <div
        className="relative flex h-[116px] w-[116px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#D8DFEA ${normalizedProgress}%, #FFFFFF ${normalizedProgress}% 100%)`,
        }}
      >
        <div className="absolute inset-[5px] rounded-full bg-[var(--color-blue-soft)]" />
        <div className="absolute inset-[10px] rounded-full border-[4px] border-[#D6DDEA] bg-white" />
        <span className="dashboard-v2-page-title relative z-10 text-[#26396E]">{value}</span>
      </div>
    </div>
  );
}

export function CandidateHoursOverviewCard({
  summary,
  mode = 'supervision',
}: CandidateHoursOverviewCardProps) {
  if (mode === 'mentorship') {
    const mentor = summary.mentor ?? { total: 0, required: 24, percent: 0, pending: 0 };
    const remaining = Math.max(0, mentor.required - mentor.total - mentor.pending);

    return (
      <section className="mt-5 overflow-hidden rounded-[22px] bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <div className="mb-8 flex items-center gap-2">
          <h3 className="dashboard-v2-title">Часы менторства</h3>
          <HelpBadge title="Подтвержденные часы менторства кандидата в активном цикле." />
        </div>

        <div className="grid gap-5 lg:grid-cols-[178px_minmax(0,1fr)]">
          <TotalCircle
            label="Всего"
            value={formatNumber(mentor.total)}
            progress={mentor.percent}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <MetricCard
              label="Требуется"
              value={formatNumber(mentor.required)}
              hint="Фиксированное количество часов менторства для текущего цикла."
            />
            <MetricCard
              label="На рассмотрении"
              value={formatNumber(mentor.pending)}
              hint="Часы менторства, ожидающие проверки."
            />
            <MetricCard
              label="Осталось"
              value={formatNumber(remaining)}
              hint="Сколько часов менторства осталось подтвердить до выполнения условия."
            />
          </div>
        </div>
      </section>
    );
  }

  const practiceProgress = getProgressPercent(
    summary.practiceBreakdown.total,
    summary.required?.practice ?? 0,
  );
  const supervisionProgress = getProgressPercent(
    summary.supervisionBreakdown.total,
    summary.required?.supervision ?? 0,
  );

  const fieldPractice = summary.practiceBreakdown.legacy + summary.practiceBreakdown.implementing;
  const infoPractice = summary.practiceBreakdown.programming;

  return (
    <section className="mt-5 overflow-hidden rounded-[22px] bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className="min-w-0">
          <div className="mb-8 flex items-center gap-2">
            <h3 className="dashboard-v2-title">Часы практики</h3>
            <HelpBadge title="Подтвержденные часы практики кандидата в активном цикле." />
          </div>

          <div className="grid gap-5 sm:grid-cols-[178px_minmax(0,1fr)]">
            <TotalCircle
              label="Всего"
              value={formatNumber(summary.practiceBreakdown.total)}
              progress={practiceProgress}
            />

            <div className="grid h-full grid-rows-2 gap-5">
              <MetricCard
                label="Полевая практика"
                value={formatNumber(fieldPractice)}
                hint="Старые записи практики и новый подтип полевой практики."
              />
              <MetricCard
                label="Работа с информацией"
                value={formatNumber(infoPractice)}
                hint="Подтвержденные часы работы с информацией."
              />
            </div>
          </div>
        </div>

        <div
          className="min-w-0 border-t pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0"
          style={{ borderColor: 'rgba(31,48,94,0.22)' }}
        >
          <div className="mb-8 flex items-center gap-2">
            <h3 className="dashboard-v2-title">Часы супервизии</h3>
            <HelpBadge title="Распределение подтвержденных часов супервизии кандидата." />
          </div>

          <div className="grid gap-5 lg:grid-cols-[178px_minmax(0,1fr)]">
            <TotalCircle
              label="Всего"
              value={formatNumber(summary.supervisionBreakdown.total)}
              progress={supervisionProgress}
            />

            <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <MetricCard
                  label="С наблюдением"
                  value={formatNumber(summary.supervisionBreakdown.direct)}
                  hint="Сумма индивидуальной и групповой супервизии с наблюдением."
                />
                <MetricCard
                  label="Без наблюдения"
                  value={formatNumber(summary.supervisionBreakdown.nonObserving)}
                  hint="Сумма индивидуальной и групповой супервизии без наблюдения."
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <MetricSegmentPair
                  leftValue={formatNumber(summary.supervisionBreakdown.directIndividual)}
                  rightValue={formatNumber(summary.supervisionBreakdown.directGroup)}
                />

                <MetricSegmentPair
                  leftValue={formatNumber(summary.supervisionBreakdown.nonObservingIndividual)}
                  rightValue={formatNumber(summary.supervisionBreakdown.nonObservingGroup)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
