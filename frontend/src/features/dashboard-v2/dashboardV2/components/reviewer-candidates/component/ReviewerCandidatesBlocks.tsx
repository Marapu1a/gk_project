import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { useReviewerCandidates } from '@/features/supervision/hooks/useReviewerCandidates';
import { useUpdateReviewerCandidateRelation } from '@/features/supervision/hooks/useUpdateReviewerCandidateRelation';
import type { ReviewerCandidate } from '@/features/supervision/api/getReviewerCandidates';

type CandidateKind = 'supervision' | 'mentorship';

const statusLabels: Record<ReviewerCandidate['status'], string> = {
  PENDING: '',
  ACCEPTED: 'Заявка принята',
  REJECTED: 'Заявка отклонена',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'dd.MM.yyyy');
}

function getCandidateDate(candidate: ReviewerCandidate) {
  return candidate.latestPendingRequestAt ?? candidate.latestRequestAt;
}

function splitName(fullName: string | null, email: string) {
  const value = fullName?.trim() || email;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [value];
  return [parts[0], parts.slice(1).join(' ')];
}

export function ReviewerCandidatesBlocks() {
  const { data, isLoading, isError } = useReviewerCandidates(3);

  if (isLoading) {
    return (
      <section className="card-section">
        <p className="dashboard-v2-text text-blue-dark">Загрузка кандидатов...</p>
      </section>
    );
  }

  if (isError || !data || !data.canReviewSupervision) {
    return null;
  }

  return (
    <div className="space-y-6">
      <CandidatesTable
        kind="supervision"
        title="Кандидаты: супервизия"
        candidates={data.supervision}
        compact
      />

      {data.canReviewMentorship ? (
        <CandidatesTable
          kind="mentorship"
          title="Кандидаты: менторство"
          candidates={data.mentorship}
          compact
        />
      ) : null}
    </div>
  );
}

function CandidatesTable({
  kind,
  title,
  candidates,
  compact = false,
}: {
  kind: CandidateKind;
  title: string;
  candidates: ReviewerCandidate[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const mutation = useUpdateReviewerCandidateRelation();

  const acceptCandidate = async (candidate: ReviewerCandidate) => {
    try {
      await mutation.mutateAsync({ id: candidate.relationId, status: 'ACCEPTED' });
      toast.success(`Кандидат принят: ${candidate.email}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось принять кандидата');
    }
  };

  const rejectCandidate = async (candidate: ReviewerCandidate) => {
    try {
      await mutation.mutateAsync({ id: candidate.relationId, status: 'REJECTED' });
      toast.success(`Кандидат отклонён: ${candidate.email}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось отклонить кандидата');
    }
  };

  return (
    <section
      className={
        compact
          ? 'rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]'
          : 'bg-transparent'
      }
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        {compact ? <h2 className="dashboard-v2-title">{title}</h2> : null}

        {compact ? (
          <button
            type="button"
            onClick={() => navigate(`/reviewer/candidates/${kind}`)}
            className="btn dashboard-v2-action dashboard-v2-action-secondary"
            title={`Открыть полный список: ${title}`}
          >
            История
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="dashboard-v2-text w-full min-w-[880px] text-[#1F305E]">
          <thead>
            <tr className="bg-[var(--color-blue-soft)] text-left">
              <th className="rounded-l-[8px] px-4 py-3 font-medium">ФИО ↑</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 text-center font-medium">Дата заявки</th>
              <th className="rounded-r-[8px] px-4 py-3 text-center font-medium">Статус</th>
            </tr>
          </thead>

          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-center text-[#6B7894]">
                  Кандидатов пока нет.
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => {
                const isRejected = candidate.status === 'REJECTED';
                const isPending = candidate.status === 'PENDING';
                const canOpenDetails = candidate.status === 'ACCEPTED';
                const nameLines = splitName(candidate.fullName, candidate.email);

                return (
                  <tr
                    key={`${kind}-${candidate.userId}`}
                    className={`border-b border-[#DCE8EC] last:border-b-0 ${
                      isRejected ? 'text-[#A7B1C7]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ActionArrowButton
                          onClick={() => {
                            if (canOpenDetails) {
                              navigate(`/reviewer/candidates/${kind}/${candidate.userId}`);
                            }
                          }}
                          disabled={!canOpenDetails}
                          size={30}
                          aria-label={
                            canOpenDetails
                              ? 'Открыть детали кандидата'
                              : 'Детали будут доступны после принятия кандидата'
                          }
                          title={
                            canOpenDetails
                              ? 'Открыть детали кандидата'
                              : 'Детали будут доступны после принятия кандидата'
                          }
                        />

                        <div className="min-w-0 leading-[1.15]">
                          <div className="font-extrabold">{nameLines[0]}</div>
                          {nameLines.slice(1).map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{candidate.email}</td>
                    <td className="px-4 py-3 text-center">{formatDate(getCandidateDate(candidate))}</td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => acceptCandidate(candidate)}
                            disabled={mutation.isPending}
                            className="btn btn-dark dashboard-v2-label h-[32px] min-w-[112px] cursor-pointer rounded-full px-5 disabled:cursor-not-allowed disabled:bg-[#B7BFCE]"
                          >
                            Принять
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectCandidate(candidate)}
                            disabled={mutation.isPending}
                            className="btn dashboard-v2-label h-[32px] min-w-[112px] cursor-pointer rounded-full border-2 border-[#1F305E] px-5 text-[#1F305E] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : candidate.status === 'ACCEPTED' ? (
                        <div className="flex justify-center">
                          <span className="dashboard-v2-caption rounded-full bg-[var(--color-blue-soft)] px-3 py-1 text-[#1F305E]">
                            {statusLabels[candidate.status]}
                          </span>
                        </div>
                      ) : (
                        <div className="dashboard-v2-caption text-center text-[#7F8AA3]">
                          {statusLabels[candidate.status]}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReviewerCandidatesTable({
  kind,
  title,
  candidates,
}: {
  kind: CandidateKind;
  title: string;
  candidates: ReviewerCandidate[];
}) {
  return <CandidatesTable kind={kind} title={title} candidates={candidates} />;
}
