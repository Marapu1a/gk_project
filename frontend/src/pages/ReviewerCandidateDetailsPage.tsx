import { useParams } from 'react-router-dom';
import { PageNav } from '@/components/PageNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CandidateCeuCard } from '@/features/supervision/components/reviewer-candidate-details/CandidateCeuCard';
import { CandidateHoursOverviewCard } from '@/features/supervision/components/reviewer-candidate-details/CandidateHoursOverviewCard';
import { CandidateInfoCard } from '@/features/supervision/components/reviewer-candidate-details/CandidateInfoCard';
import { CandidateRequestsCard } from '@/features/supervision/components/reviewer-candidate-details/CandidateRequestsCard';
import { CandidateTargetCard } from '@/features/supervision/components/reviewer-candidate-details/CandidateTargetCard';
import { useReviewerCandidateDetails } from '@/features/supervision/hooks/useReviewerCandidateDetails';
import type {
  ReviewerCandidateKind,
  TargetLevel,
} from '@/features/supervision/api/getReviewerCandidateDetails';

const TARGET_LABELS: Record<TargetLevel, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const KIND_LABELS: Record<ReviewerCandidateKind, string> = {
  supervision: 'Отправки часов супервизии',
  mentorship: 'Отправки часов менторства',
};

function isKind(value: string | undefined): value is ReviewerCandidateKind {
  return value === 'supervision' || value === 'mentorship';
}

function getTargetDisplayLabel(data: NonNullable<ReturnType<typeof useReviewerCandidateDetails>['data']>) {
  const target = data.activeCycle.targetLevel;
  const primaryGroupName = data.candidate.primaryGroup?.name;

  if (
    data.activeCycle.type === 'RENEWAL' &&
    target === 'SUPERVISOR' &&
    (primaryGroupName === 'Супервизор' || primaryGroupName === 'Опытный Супервизор')
  ) {
    return 'Опытный Супервизор';
  }

  return TARGET_LABELS[target];
}

function ReviewerCandidateDetailsContent() {
  const params = useParams();
  const kind = isKind(params.kind) ? params.kind : 'supervision';
  const userId = params.userId;
  const { data, isLoading, isError, error } = useReviewerCandidateDetails(userId, kind);

  if (isLoading) {
    return (
      <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
        <p className="dashboard-v2-text text-blue-dark">Загрузка кандидата...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <PageNav />
        </div>
        <p className="dashboard-v2-text text-error">
          {(error as any)?.response?.data?.error || 'Не удалось загрузить кандидата'}
        </p>
      </div>
    );
  }

  const candidate = data.candidate;
  const activeRequests = kind === 'mentorship' ? data.requests.mentorship : data.requests.supervision;
  const otherRequests = kind === 'mentorship' ? data.requests.supervision : data.requests.mentorship;
  const mentorSummary = data.supervisionSummary.mentor;
  const hoursCurrent =
    kind === 'mentorship'
      ? (mentorSummary?.total ?? 0)
      : data.supervisionSummary.supervisionConfirmed;
  const hoursRequired =
    kind === 'mentorship'
      ? (mentorSummary?.required ?? data.supervisionSummary.required?.supervisor ?? 24)
      : (data.supervisionSummary.required?.supervision ?? 0);

  return (
    <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <PageNav />
        </div>

        <h1 className="dashboard-v2-page-title min-w-0 text-center">
          Детали кандидата
        </h1>

        <div className="hidden min-w-[188px] sm:block" aria-hidden="true" />
      </header>

      <div className="grid gap-5 xl:grid-cols-3">
        <CandidateInfoCard
          fullName={candidate.fullName}
          email={candidate.email}
          avatarUrl={candidate.avatarUrl}
          groupName={candidate.primaryGroup?.name || '—'}
        />
        <CandidateTargetCard
          targetLabel={getTargetDisplayLabel(data)}
          ceuCurrent={data.ceuSummary.usable.total}
          ceuRequired={data.ceuSummary.required?.total ?? 0}
          supervisionCurrent={hoursCurrent}
          supervisionRequired={hoursRequired}
          supervisionLabel={kind === 'mentorship' ? 'Часы менторства' : 'Часы супервизии'}
          documentsReady={false}
        />
        <CandidateCeuCard summary={data.ceuSummary} />
      </div>

      <CandidateHoursOverviewCard summary={data.supervisionSummary} mode={kind} />

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <CandidateRequestsCard kind={kind} title={KIND_LABELS[kind]} requests={activeRequests} />
        {otherRequests.length > 0 ? (
          <CandidateRequestsCard
            kind={kind === 'mentorship' ? 'supervision' : 'mentorship'}
            title={kind === 'mentorship' ? KIND_LABELS.supervision : KIND_LABELS.mentorship}
            requests={otherRequests}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ReviewerCandidateDetailsPage() {
  return (
    <ProtectedRoute>
      <ReviewerCandidateDetailsContent />
    </ProtectedRoute>
  );
}
