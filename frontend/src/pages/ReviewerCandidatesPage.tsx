import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useReviewerCandidates } from '@/features/supervision/hooks/useReviewerCandidates';
import { ReviewerCandidatesTable } from '@/features/dashboard-v2/dashboardV2/components/reviewer-candidates/component/ReviewerCandidatesBlocks';

type CandidateKind = 'supervision' | 'mentorship';

const TITLES: Record<CandidateKind, string> = {
  supervision: 'Кандидаты: супервизия',
  mentorship: 'Кандидаты: менторство',
};

function isCandidateKind(value: string | undefined): value is CandidateKind {
  return value === 'supervision' || value === 'mentorship';
}

function ReviewerCandidatesContent() {
  const navigate = useNavigate();
  const params = useParams();
  const kind = isCandidateKind(params.kind) ? params.kind : 'supervision';
  const { data, isLoading, isError } = useReviewerCandidates(100);

  const candidates = useMemo(() => {
    if (!data) return [];
    return kind === 'supervision' ? data.supervision : data.mentorship;
  }, [data, kind]);

  const canView =
    kind === 'supervision' ? data?.canReviewSupervision : data?.canReviewMentorship;

  return (
    <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
      <header className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard-v2')}
          className="inline-flex h-[30px] min-w-[88px] cursor-pointer items-center justify-center rounded-full border border-[#A7B1C7] px-3 text-[14px] font-medium text-[#1F305E] hover:bg-white active:bg-[#E7F1F4]"
        >
          ← Профиль
        </button>

        <h1 className="min-w-0 text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
          {TITLES[kind]}
        </h1>

        <div className="hidden min-w-[88px] sm:block" aria-hidden="true" />
      </header>

      <section className="rounded-[16px] bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        {isLoading ? (
          <p className="text-[14px] text-[#6B7894]">Загрузка кандидатов...</p>
        ) : isError || !data ? (
          <p className="text-[14px] text-[#FF5364]">Не удалось загрузить кандидатов</p>
        ) : !canView ? (
          <p className="text-[14px] text-[#6B7894]">У вас нет доступа к этому списку.</p>
        ) : (
          <ReviewerCandidatesTable
            kind={kind}
            title={TITLES[kind]}
            candidates={candidates}
          />
        )}
      </section>
    </div>
  );
}

export default function ReviewerCandidatesPage() {
  return (
    <ProtectedRoute>
      <ReviewerCandidatesContent />
    </ProtectedRoute>
  );
}
