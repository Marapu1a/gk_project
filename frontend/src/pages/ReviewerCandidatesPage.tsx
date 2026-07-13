import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { DashboardDateInput } from '@/components/DashboardDateInput';
import { DashboardButton } from '@/components/DashboardButton';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import type { ReviewerCandidateKind } from '@/features/supervision/api/getReviewerCandidateDetails';
import type {
  ReviewerRequestListItem,
  ReviewerRequestStatus,
} from '@/features/supervision/api/getReviewerRequests';
import { CandidateRequestDetailsModal } from '@/features/supervision/components/reviewer-candidate-details/CandidateRequestDetailsModal';
import { useReviewerRequests } from '@/features/supervision/hooks/useReviewerRequests';
import { getSupervisionRequestDateLabel } from '@/features/supervision/utils/requestDateLabels';
import { NameSortButton, nextNameSortDirection, type NameSortDirection } from '@/components/NameSortButton';

const STATUS_LABELS: Record<ReviewerRequestStatus, string> = {
  ALL: 'Все состояния',
  UNCONFIRMED: 'Требуют проверки',
  CONFIRMED: 'Подтверждены',
  REJECTED: 'Отклонены',
};

const REQUEST_STATUS_LABELS = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
  SPENT: 'Использовано',
} as const;

function isKind(value: string | undefined): value is ReviewerCandidateKind {
  return value === 'supervision' || value === 'mentorship';
}

function isStatus(value: string | null): value is ReviewerRequestStatus {
  return value === 'ALL' || value === 'UNCONFIRMED' || value === 'CONFIRMED' || value === 'REJECTED';
}

function formatDate(value: string) {
  return format(new Date(value), 'dd.MM.yyyy');
}

function ReviewerCandidatesContent() {
  const navigate = useNavigate();
  const params = useParams();
  const kind = isKind(params.kind) ? params.kind : 'supervision';
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<ReviewerRequestListItem | null>(null);
  const statusParam = searchParams.get('status');
  const status: ReviewerRequestStatus = isStatus(statusParam) ? statusParam : 'ALL';
  const candidate = searchParams.get('candidate') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const nameSort: NameSortDirection =
    searchParams.get('nameSort') === 'asc'
      ? 'asc'
      : searchParams.get('nameSort') === 'desc'
        ? 'desc'
        : null;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = [20, 50, 100, 250, 500].includes(Number(searchParams.get('limit')))
    ? Number(searchParams.get('limit'))
    : 20;
  const requestDateLabel = getSupervisionRequestDateLabel(kind);

  const query = useReviewerRequests({
    kind,
    status,
    candidate: candidate || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortOrder,
    nameSort: nameSort ?? undefined,
    page,
    limit,
  });

  useEffect(() => {
    if (query.data && page > query.data.totalPages) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('page', String(query.data.totalPages));
        return next;
      });
    }
  }, [page, query.data, setSearchParams]);

  const updateFilters = (updates: Record<string, string | number | undefined>, resetPage = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'ALL') next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage) next.delete('page');
      return next;
    });
  };

  const switchKind = (nextKind: ReviewerCandidateKind) => {
    navigate(`/reviewer/candidates/${nextKind}?${searchParams.toString()}`, { replace: true });
  };

  const canView =
    kind === 'supervision'
      ? query.data?.permissions.canReviewSupervision
      : query.data?.permissions.canReviewMentorship;

  return (
    <div className="container-fixed mx-auto px-2 py-4 sm:px-6">
      <div className="mb-5">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <div className="mb-3">
            <DashboardButton />
          </div>
          <h1 className="text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
            История заявок на подтверждение часов
          </h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <header className="hidden grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 sm:grid">
          <DashboardButton />
          <h1 className="min-w-0 text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
            История заявок на подтверждение часов
          </h1>
          <div className="hidden min-w-[104px] sm:block" aria-hidden="true" />
        </header>
      </div>

      <section className="mb-5 rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-full bg-[var(--color-blue-soft)] p-1">
            {(['supervision', 'mentorship'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchKind(option)}
                disabled={option === 'mentorship' && query.data && !query.data.permissions.canReviewMentorship}
                className={`dashboard-v2-label min-h-[34px] cursor-pointer rounded-full px-5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  kind === option
                    ? 'bg-[var(--color-blue-dark)] text-white'
                    : 'text-[var(--color-blue-dark)] hover:bg-white/70'
                }`}
              >
                {option === 'supervision' ? 'Супервизия' : 'Менторство'}
              </button>
            ))}
          </div>
          <span className="dashboard-v2-caption text-[#6B7894]">
            Найдено: <strong className="text-[#1F305E]">{query.data?.total ?? 0}</strong>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="dashboard-v2-small text-[#1F305E]">
            Заявки с
            <DashboardDateInput
              value={dateFrom}
              onChange={(value) => updateFilters({ dateFrom: value })}
              className="mt-1 h-[36px]"
              ariaLabel="Заявки с"
            />
          </label>
          <label className="dashboard-v2-small text-[#1F305E]">
            Заявки по
            <DashboardDateInput
              value={dateTo}
              onChange={(value) => updateFilters({ dateTo: value })}
              className="mt-1 h-[36px]"
              ariaLabel="Заявки по"
            />
          </label>
          <label className="dashboard-v2-small text-[#1F305E]">
            Кандидат
            <input
              type="search"
              value={candidate}
              list="reviewer-history-candidates"
              onChange={(event) => updateFilters({ candidate: event.target.value })}
              placeholder="ФИО или email"
              className="input-design mt-1 h-[36px]"
            />
            <datalist id="reviewer-history-candidates">
              {(query.data?.candidates ?? []).map((item) => (
                <option key={item.id} value={item.email}>
                  {item.fullName || item.email}
                </option>
              ))}
            </datalist>
          </label>
          <label className="dashboard-v2-small text-[#1F305E]">
            Состояние заявки
            <select
              value={status}
              onChange={(event) =>
                updateFilters({ status: event.target.value as ReviewerRequestStatus })
              }
              className="input-design mt-1 h-[36px]"
            >
              {(Object.keys(STATUS_LABELS) as ReviewerRequestStatus[]).map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#DCE8EC] pt-4">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="btn dashboard-v2-action dashboard-v2-action-secondary"
          >
            Сбросить фильтры
          </button>
          <PageSizeSelect
            value={limit}
            onChange={(value) => updateFilters({ limit: value })}
          />
        </div>
      </section>

      <section className="rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        {query.isLoading ? (
          <p className="py-8 text-center text-[#6B7894]">Загрузка истории...</p>
        ) : query.isError || !query.data ? (
          <p className="py-8 text-center text-[var(--color-danger)]">Не удалось загрузить историю.</p>
        ) : !canView ? (
          <p className="py-8 text-center text-[#6B7894]">У вас нет доступа к этой истории.</p>
        ) : query.data.items.length === 0 ? (
          <p className="py-8 text-center text-[#6B7894]">Заявки не найдены.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-v2-text w-full min-w-[760px] text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="rounded-l-[8px] px-4 py-3 font-medium">
                    <NameSortButton
                      label="Кандидат"
                      direction={nameSort}
                      onClick={() => updateFilters({ nameSort: nextNameSortDirection(nameSort) ?? undefined })}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 text-center font-medium">Часы</th>
                  <th className="px-4 py-3 text-center font-medium">Состояние</th>
                  <th className="px-4 py-3 text-center font-medium">
                    <button
                      type="button"
                      onClick={() => updateFilters({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })}
                      className="cursor-pointer font-medium"
                    >
                      {requestDateLabel} {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th className="rounded-r-[8px] px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((request) => (
                  <tr key={request.id} className="border-b border-[#DCE8EC] last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className="cursor-pointer text-left font-extrabold transition-colors hover:text-[#526C9D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F305E]"
                        title="Открыть заявку"
                      >
                        {request.candidate.fullName || request.candidate.email}
                      </button>
                    </td>
                    <td className="px-4 py-3">{request.candidate.email}</td>
                    <td className="px-4 py-3 text-center">{request.totals.total}</td>
                    <td className="px-4 py-3 text-center">
                      {REQUEST_STATUS_LABELS[request.status]}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatDate(request.supervisionDate ?? request.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ActionArrowButton
                        onClick={() => setSelectedRequest(request)}
                        size={31}
                        title="Открыть заявку"
                        aria-label="Открыть заявку"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5">
        <DashboardPagination
          page={query.data?.page ?? page}
          totalPages={query.data?.totalPages ?? 1}
          onPageChange={(nextPage) => updateFilters({ page: nextPage }, false)}
        />
      </div>

      {selectedRequest ? (
        <CandidateRequestDetailsModal
          kind={kind}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      ) : null}
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
