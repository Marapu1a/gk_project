import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { DashboardHelpPopover } from '@/features/dashboard-guidance';
import { CandidateRequestDetailsModal } from '@/features/supervision/components/reviewer-candidate-details/CandidateRequestDetailsModal';
import { useReviewerCandidates } from '@/features/supervision/hooks/useReviewerCandidates';
import { useReviewerRequests } from '@/features/supervision/hooks/useReviewerRequests';
import { useUpdateReviewerCandidateRelation } from '@/features/supervision/hooks/useUpdateReviewerCandidateRelation';
import { getSupervisionRequestDateLabel } from '@/features/supervision/utils/requestDateLabels';
import { NameSortButton, nextNameSortDirection, sortByFullName, type NameSortDirection } from '@/components/NameSortButton';
import type { ReviewerCandidate } from '@/features/supervision/api/getReviewerCandidates';
import type { ReviewerRequestListItem } from '@/features/supervision/api/getReviewerRequests';
import { formatDateRu as formatDate } from '@/utils/dateFormat';

type CandidateKind = 'supervision' | 'mentorship';
type DashboardMode = 'candidates' | 'review';

const COOPERATION_HELP = `Кандидат указал вас как супервизора и хочет направлять вам заявки на подтверждение часов практики.

Подтвердите сотрудничество, если вы действительно договорились работать вместе.

После подтверждения кандидат появится в вашем списке кандидатов. Подтверждение сотрудничества не означает автоматическое принятие часов — все заявки на часы будут рассматриваться отдельно.`;

function splitName(fullName: string | null, email: string) {
  const value = fullName?.trim() || email;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [value];
  return [parts[0], parts.slice(1).join(' ')];
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; badge?: number }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-[var(--color-blue-soft)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`dashboard-v2-label flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full px-5 transition ${
            value === option.value
              ? 'bg-[var(--color-blue-dark)] text-white'
              : 'text-[var(--color-blue-dark)] hover:bg-white/70'
          }`}
        >
          {option.label}
          {option.badge ? (
            <span
              className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-extrabold ${
                value === option.value
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'bg-[var(--color-danger)] text-white'
              }`}
            >
              {option.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ReviewerCandidatesBlocks() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReviewerCandidates(50);
  const [kind, setKind] = useState<CandidateKind>('supervision');
  const [mode, setMode] = useState<DashboardMode>('candidates');
  const [selectedRequest, setSelectedRequest] = useState<ReviewerRequestListItem | null>(null);
  const [candidateNameSort, setCandidateNameSort] = useState<NameSortDirection>(null);
  const pendingRequests = useReviewerRequests(
    {
      kind,
      status: 'UNCONFIRMED',
      page: 1,
      limit: 5,
      sortOrder: 'desc',
    },
    !!data?.canReviewSupervision,
  );

  const candidates = useMemo(() => {
    const source = kind === 'mentorship' ? data?.mentorship : data?.supervision;
    const visible = (source ?? []).filter((candidate) => candidate.status !== 'REJECTED');
    if (!candidateNameSort) return visible;

    const pending = sortByFullName(
      visible.filter((candidate) => candidate.status === 'PENDING'),
      (candidate) => candidate.fullName || candidate.email,
      candidateNameSort,
    );
    const accepted = sortByFullName(
      visible.filter((candidate) => candidate.status === 'ACCEPTED'),
      (candidate) => candidate.fullName || candidate.email,
      candidateNameSort,
    );
    return [...pending, ...accepted];
  }, [candidateNameSort, data, kind]);

  if (isLoading) {
    return (
      <section className="card-section">
        <p className="dashboard-v2-text text-blue-dark">Загрузка кандидатов...</p>
      </section>
    );
  }

  if (isError || !data || !data.canReviewSupervision) return null;

  return (
    <section className="rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {data.canReviewMentorship ? (
            <SegmentedControl
              value={kind}
              onChange={(nextKind) => {
                setKind(nextKind);
                setMode('candidates');
              }}
              options={[
                { value: 'supervision', label: 'Супервизия' },
                { value: 'mentorship', label: 'Менторство' },
              ]}
            />
          ) : (
            <h2 className="dashboard-v2-title">Супервизия</h2>
          )}

          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'candidates', label: 'Кандидаты' },
              {
                value: 'review',
                label: 'На проверку',
                badge: pendingRequests.data?.total ?? 0,
              },
            ]}
          />
          {mode === 'candidates' ? (
            <DashboardHelpPopover title="Подтверждение сотрудничества" align="left">
              {COOPERATION_HELP}
            </DashboardHelpPopover>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/reviewer/candidates/${kind}`)}
          className="btn dashboard-v2-action dashboard-v2-action-secondary"
        >
          История
        </button>
      </div>

      {mode === 'candidates' ? (
        <CandidatesTable
          kind={kind}
          candidates={candidates}
          nameSort={candidateNameSort}
          onToggleNameSort={() => setCandidateNameSort((current) => nextNameSortDirection(current))}
        />
      ) : (
        <ReviewQueue
          kind={kind}
          isLoading={pendingRequests.isLoading}
          isError={pendingRequests.isError}
          items={pendingRequests.data?.items ?? []}
          onOpen={setSelectedRequest}
        />
      )}

      {selectedRequest ? (
        <CandidateRequestDetailsModal
          kind={kind}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      ) : null}
    </section>
  );
}

function CandidatesTable({
  kind,
  candidates,
  nameSort,
  onToggleNameSort,
}: {
  kind: CandidateKind;
  candidates: ReviewerCandidate[];
  nameSort: NameSortDirection;
  onToggleNameSort: () => void;
}) {
  const navigate = useNavigate();
  const mutation = useUpdateReviewerCandidateRelation();
  const { confirm } = useConfirm();
  const hasPending = candidates.some((candidate) => candidate.status === 'PENDING');
  const firstAcceptedIndex = candidates.findIndex((candidate) => candidate.status === 'ACCEPTED');

  const updateRelation = async (
    candidate: ReviewerCandidate,
    status: 'ACCEPTED' | 'REJECTED',
  ) => {
    const candidateName = candidate.fullName || candidate.email;

    const ok = await confirm({
      message:
        status === 'ACCEPTED'
          ? `Подтвердить сотрудничество с ${candidateName}?`
          : `Отклонить сотрудничество с ${candidateName}?`,
      confirmLabel: status === 'ACCEPTED' ? 'Подтвердить' : 'Отклонить',
      variant: status === 'ACCEPTED' ? 'primary' : 'danger',
    });

    if (!ok) return;

    try {
      await mutation.mutateAsync({ id: candidate.relationId, status });
      toast.success(
        status === 'ACCEPTED'
          ? `Сотрудничество подтверждено: ${candidate.email}`
          : `Сотрудничество отклонено: ${candidate.email}`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось изменить статус сотрудничества');
    }
  };

  return (
    <div>
      {hasPending ? (
        <h3 className="dashboard-v2-title mb-3">Ожидают подтверждения сотрудничества</h3>
      ) : null}

      <div className="overflow-x-auto">
        <table className="dashboard-v2-text w-full min-w-[820px] text-[#1F305E]">
          <thead>
            <tr className="bg-[var(--color-blue-soft)] text-left">
              <th className="rounded-l-[8px] px-4 py-3 font-medium">
                <NameSortButton direction={nameSort} onClick={onToggleNameSort} />
              </th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 text-center font-medium">Дата заявки</th>
              <th className="px-4 py-3 text-center font-medium">Состояние</th>
              <th className="w-[54px] rounded-r-[8px] px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-[#6B7894]">
                  Кандидатов пока нет.
                </td>
              </tr>
            ) : (
              candidates.map((candidate, index) => {
                const isPending = candidate.status === 'PENDING';
                const nameLines = splitName(candidate.fullName, candidate.email);
                return (
                  <Fragment key={`${kind}-${candidate.relationId}`}>
                    {index === firstAcceptedIndex ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border-b border-[#DCE8EC] bg-[#F7F9FA] px-4 py-2 font-extrabold text-[#1F305E]"
                        >
                          Активные кандидаты
                        </td>
                      </tr>
                    ) : null}
                    <tr className="border-b border-[#DCE8EC] last:border-b-0">
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="min-w-0 leading-[1.15]">
                          <div className="font-extrabold">{nameLines[0]}</div>
                          {nameLines.slice(1).map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/reviewer/candidates/${kind}/${candidate.userId}`)
                          }
                          className="min-w-0 cursor-pointer text-left leading-[1.15] transition-colors hover:text-[#526C9D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F305E]"
                          title="Открыть детали кандидата"
                        >
                          <span className="block font-extrabold">{nameLines[0]}</span>
                          {nameLines.slice(1).map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{candidate.email}</td>
                    <td className="px-4 py-3 text-center">
                      {formatDate(candidate.latestPendingRequestAt ?? candidate.latestRequestAt)}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => updateRelation(candidate, 'ACCEPTED')}
                            disabled={mutation.isPending}
                            className="btn btn-dark dashboard-v2-caption min-h-[34px] rounded-full px-4 disabled:bg-[#B7BFCE]"
                          >
                            Подтвердить сотрудничество
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRelation(candidate, 'REJECTED')}
                            disabled={mutation.isPending}
                            className="btn dashboard-v2-caption min-h-[34px] rounded-full border-2 border-[#1F305E] px-4 text-[#1F305E] disabled:opacity-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <span className="dashboard-v2-caption rounded-full bg-[var(--color-blue-soft)] px-3 py-1">
                            Сотрудничество подтверждено
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ActionArrowButton
                        onClick={() =>
                          navigate(`/reviewer/candidates/${kind}/${candidate.userId}`)
                        }
                        disabled={isPending}
                        size={30}
                        title={
                          isPending
                            ? 'Сначала подтвердите сотрудничество'
                            : 'Открыть детали кандидата'
                        }
                        aria-label={
                          isPending
                            ? 'Сначала подтвердите сотрудничество'
                            : 'Открыть детали кандидата'
                        }
                      />
                    </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewQueue({
  kind,
  items,
  isLoading,
  isError,
  onOpen,
}: {
  kind: CandidateKind;
  items: ReviewerRequestListItem[];
  isLoading: boolean;
  isError: boolean;
  onOpen: (request: ReviewerRequestListItem) => void;
}) {
  const navigate = useNavigate();
  const requestDateLabel = getSupervisionRequestDateLabel(kind);

  if (isLoading) return <p className="py-6 text-center text-[#6B7894]">Загрузка заявок...</p>;
  if (isError) return <p className="py-6 text-center text-[var(--color-danger)]">Не удалось загрузить заявки.</p>;
  if (!items.length) {
    return <p className="py-6 text-center text-[#6B7894]">Новых заявок на проверку нет.</p>;
  }

  return (
    <div className="divide-y divide-[#DCE8EC]">
      {items.map((request) => (
        <div key={request.id} className="py-3">
          {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
          <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_150px_90px_36px]">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/reviewer/candidates/${kind}/${request.candidate.id}`)}
                className="dashboard-v2-text cursor-pointer text-left font-extrabold text-[#1F305E] transition-colors hover:text-[#526C9D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F305E]"
                title="Открыть детали кандидата"
              >
                {request.candidate.fullName || request.candidate.email}
              </button>
              <div className="dashboard-v2-caption text-[#6B7894]">{request.candidate.email}</div>
            </div>
            <div className="dashboard-v2-caption text-[#1F305E]">
              {request.totals.total} ч.
            </div>
            <div className="dashboard-v2-caption text-[#6B7894]">
              <span className="sr-only">{requestDateLabel}: </span>
              {formatDate(request.supervisionDate ?? request.createdAt)}
            </div>
            <ActionArrowButton
              onClick={() => onOpen(request)}
              size={31}
              title="Открыть заявку"
              aria-label="Открыть заявку"
            />
          </div>

          {/* Мобильная версия — карточка вместо разъехавшейся сетки */}
          <div className="flex items-start justify-between gap-3 sm:hidden">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/reviewer/candidates/${kind}/${request.candidate.id}`)}
                className="dashboard-v2-text cursor-pointer text-left font-extrabold text-[#1F305E] transition-colors hover:text-[#526C9D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F305E]"
                title="Открыть детали кандидата"
              >
                {request.candidate.fullName || request.candidate.email}
              </button>
              <div className="dashboard-v2-caption text-[#6B7894]">{request.candidate.email}</div>

              <div className="dashboard-v2-caption mt-2 flex items-center gap-3">
                <span className="font-semibold text-[#1F305E]">{request.totals.total} ч.</span>
                <span className="text-[#6B7894]">
                  <span className="sr-only">{requestDateLabel}: </span>
                  {formatDate(request.supervisionDate ?? request.createdAt)}
                </span>
              </div>
            </div>

            <ActionArrowButton
              onClick={() => onOpen(request)}
              size={31}
              title="Открыть заявку"
              aria-label="Открыть заявку"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
