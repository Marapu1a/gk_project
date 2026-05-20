import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageNav } from '@/components/PageNav';
import { Button } from '@/components/Button';
import { useAdminReviewerCandidates } from '@/features/admin/hooks/supervision/useAdminReviewerCandidates';
import type {
  AdminReviewerCandidateKind,
  AdminReviewerCandidateRow,
  AdminReviewerCandidateSortBy,
  AdminReviewerCandidateSortDir,
  AdminReviewerHourState,
} from '@/features/admin/api/supervision/getAdminReviewerCandidates';

const KIND_LABELS: Record<AdminReviewerCandidateKind, string> = {
  supervision: 'Супервизия',
  mentorship: 'Менторство',
};

const RELATION_STATUS_LABELS: Record<AdminReviewerCandidateRow['relationStatus'], string> = {
  PENDING: 'связь ожидает принятия',
  ACCEPTED: 'связь принята',
  REJECTED: 'связь отклонена',
};

const HOUR_STATE_OPTIONS: Array<{ value: AdminReviewerHourState | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все состояния' },
  { value: 'NEEDS_REVIEW', label: 'Требуют проверки' },
  { value: 'CONFIRMED_BY_ADMIN', label: 'Подтверждены админом' },
  { value: 'REJECTED_BY_ADMIN', label: 'Отклонены админом' },
  { value: 'CONFIRMED_BY_REVIEWER', label: 'Подтверждены проверяющим' },
  { value: 'REJECTED_BY_REVIEWER', label: 'Отклонены проверяющим' },
];

type HourStateTone = 'danger' | 'muted' | 'normal' | 'success';
const KIND_VALUES = new Set<AdminReviewerCandidateKind>(['supervision', 'mentorship']);
const HOUR_STATE_VALUES = new Set<AdminReviewerHourState | 'ALL'>(
  [...HOUR_STATE_OPTIONS.map((option) => option.value), 'NO_NEW_HOURS'] as Array<
    AdminReviewerHourState | 'ALL'
  >,
);
const SORT_VALUES = new Set<AdminReviewerCandidateSortBy>([
  'candidate',
  'candidateEmail',
  'reviewerEmail',
  'createdAt',
  'status',
]);

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function candidateName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

function hourState(row: AdminReviewerCandidateRow): { text: string; tone: HourStateTone } {
  if (row.pendingCount > 0) {
    return { text: `Есть новые часы: ${row.pendingCount}`, tone: 'danger' };
  }

  const review = row.latestReview;
  if (review) {
    const action = review.status === 'REJECTED' ? 'Отклонено' : 'Подтверждено';
    if (review.reviewedByAdmin && review.reviewedBy?.email) {
      return { text: `${action} админом: ${review.reviewedBy.email}`, tone: review.status === 'REJECTED' ? 'danger' : 'success' };
    }
    return { text: `${action} проверяющим`, tone: review.status === 'REJECTED' ? 'danger' : 'success' };
  }

  if (row.relationStatus === 'PENDING') {
    return { text: 'Ожидает принятия проверяющим', tone: 'danger' };
  }

  if (row.relationStatus === 'REJECTED') {
    return { text: 'Связь отклонена проверяющим', tone: 'muted' };
  }

  return { text: 'Нет часов на проверку', tone: 'muted' };
}

function hourStateClass(tone: HourStateTone) {
  if (tone === 'danger') return 'text-[var(--color-danger)]';
  if (tone === 'success') return 'text-[#1F305E]';
  if (tone === 'muted') return 'text-[#8D96B5]';
  return 'text-[#1F305E]';
}

function AdminSupervisionCandidatesContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawKind = searchParams.get('kind');
  const rawHourState = searchParams.get('hourState');
  const rawSortBy = searchParams.get('sortBy');
  const rawSortDir = searchParams.get('sortDir');
  const kind: AdminReviewerCandidateKind = KIND_VALUES.has(rawKind as AdminReviewerCandidateKind)
    ? (rawKind as AdminReviewerCandidateKind)
    : 'supervision';
  const createdFrom = searchParams.get('createdFrom') ?? '';
  const createdTo = searchParams.get('createdTo') ?? '';
  const search = searchParams.get('search') ?? '';
  const reviewerSearch = searchParams.get('reviewerSearch') ?? '';
  const hourStateFilter: AdminReviewerHourState | 'ALL' = HOUR_STATE_VALUES.has(
    rawHourState as AdminReviewerHourState | 'ALL',
  )
    ? (rawHourState as AdminReviewerHourState | 'ALL')
    : 'ALL';
  const sortBy: AdminReviewerCandidateSortBy = SORT_VALUES.has(rawSortBy as AdminReviewerCandidateSortBy)
    ? (rawSortBy as AdminReviewerCandidateSortBy)
    : 'createdAt';
  const sortDir: AdminReviewerCandidateSortDir = rawSortDir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = [50, 100, 250, 500].includes(Number(searchParams.get('perPage')))
    ? Number(searchParams.get('perPage'))
    : 100;

  const updateQuery = (
    patch: Record<string, string | number | null | undefined>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams);
    const setClean = (key: string, value: string | number | null | undefined, defaultValue = '') => {
      const stringValue = value == null ? '' : String(value);
      if (!stringValue || stringValue === defaultValue) {
        next.delete(key);
      } else {
        next.set(key, stringValue);
      }
    };

    Object.entries(patch).forEach(([key, value]) => {
      const defaults: Record<string, string> = {
        kind: 'supervision',
        hourState: 'ALL',
        sortBy: 'createdAt',
        sortDir: 'desc',
        page: '1',
        perPage: '100',
      };
      setClean(key, value, defaults[key] ?? '');
    });

    if (options.resetPage !== false && !('page' in patch)) {
      next.delete('page');
    }

    setSearchParams(next, { replace: options.replace ?? true });
  };

  const params = useMemo(
    () => ({
      kind,
      createdFrom,
      createdTo,
      search: search.trim(),
      reviewerSearch: reviewerSearch.trim(),
      hourState: hourStateFilter,
      sortBy,
      sortDir,
      page,
      perPage,
    }),
    [createdFrom, createdTo, hourStateFilter, kind, page, perPage, reviewerSearch, search, sortBy, sortDir],
  );

  const { data, isLoading, isError, isFetching } = useAdminReviewerCandidates(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const setSort = (nextSortBy: AdminReviewerCandidateSortBy) => {
    if (sortBy === nextSortBy) {
      updateQuery({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    updateQuery({ sortBy: nextSortBy, sortDir: nextSortBy === 'createdAt' ? 'desc' : 'asc' });
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (kind !== 'supervision') next.set('kind', kind);
    setSearchParams(next);
  };

  return (
    <div className="container-fixed mx-auto px-5 py-4 text-blue-dark sm:px-6">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PageNav />
        <h1 className="dashboard-v2-page-title text-center">Проверка часов</h1>
        <div />
      </header>

      <section className="card-section space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-[var(--color-blue-soft)] p-1">
            {(['supervision', 'mentorship'] as AdminReviewerCandidateKind[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateQuery({ kind: item })}
                className={`dashboard-v2-label min-h-[36px] rounded-full px-5 transition ${
                  kind === item
                    ? 'bg-[var(--color-blue-dark)] text-white'
                    : 'text-[#1F305E] hover:bg-white'
                }`}
              >
                {KIND_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="dashboard-v2-text text-[#6B7894]">
            Найдено: <span className="font-extrabold text-[#1F305E]">{total}</span>
            {isFetching && !isLoading ? <span className="ml-2">обновляю...</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="dashboard-v2-small block text-[#1F305E]">
            Часы добавлены с
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => updateQuery({ createdFrom: event.target.value }, { replace: true })}
              className="input-design mt-1"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Часы добавлены по
            <input
              type="date"
              value={createdTo}
              onChange={(event) => updateQuery({ createdTo: event.target.value }, { replace: true })}
              className="input-design mt-1"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Кандидат
            <input
              value={search}
              onChange={(event) => updateQuery({ search: event.target.value }, { replace: true })}
              className="input-design mt-1"
              placeholder="ФИО или email"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Назначенный проверяющий
            <input
              value={reviewerSearch}
              onChange={(event) => updateQuery({ reviewerSearch: event.target.value }, { replace: true })}
              className="input-design mt-1"
              placeholder="ФИО или email"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Состояние часов
            <select
              value={hourStateFilter}
              onChange={(event) =>
                updateQuery({ hourState: event.target.value })
              }
              className="input-design mt-1"
            >
              {HOUR_STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Строк
            <select
              value={perPage}
              onChange={(event) => updateQuery({ perPage: event.target.value })}
              className="input-design mt-1"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button type="button" variant="ghost" className="h-[38px] w-full" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </div>
      </section>

      <section className="card-section mt-5 overflow-hidden p-0">
        {isLoading ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Загрузка отправок...</p>
        ) : isError ? (
          <p className="dashboard-v2-text p-6 text-[var(--color-danger)]">Не удалось загрузить отправки.</p>
        ) : rows.length === 0 ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Отправок не найдено.</p>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="dashboard-v2-text w-full min-w-[1120px] text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="rounded-l-[8px] px-4 py-3 font-medium"> </th>
                  <th className="px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('candidate')} className="font-medium">
                      ФИО {sortBy === 'candidate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('candidateEmail')} className="font-medium">
                      Email кандидата {sortBy === 'candidateEmail' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('reviewerEmail')} className="font-medium">
                      Назначенный проверяющий {sortBy === 'reviewerEmail' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('createdAt')} className="font-medium">
                      Последние добавленные {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="rounded-r-[8px] px-4 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('status')} className="font-medium">
                      Состояние часов {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const canOpen = row.relationStatus !== 'REJECTED';
                  const date = row.latestPendingRequestAt ?? row.latestRequestAt;
                  const state = hourState(row);

                  return (
                    <tr
                      key={row.relationId}
                      className={`border-b border-[#DCE8EC] last:border-b-0 ${
                        row.relationStatus === 'REJECTED' ? 'text-[#8D96B5]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (canOpen) {
                              navigate(
                                `/admin/supervision-candidates/${kind}/${row.relationId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
                              );
                            }
                          }}
                          disabled={!canOpen}
                          className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-blue-darker)] ${
                            canOpen ? 'cursor-pointer' : 'cursor-default opacity-45'
                          }`}
                          title={canOpen ? 'Открыть детали кандидата' : 'Связь отклонена'}
                          aria-label={canOpen ? 'Открыть детали кандидата' : 'Связь отклонена'}
                        >
                          <ArrowRight size={18} />
                        </button>
                      </td>
                      <td className="px-4 py-3 font-extrabold">
                        {candidateName(row.candidate.fullName, row.candidate.email)}
                      </td>
                      <td className="px-4 py-3">{row.candidate.email}</td>
                      <td className="px-4 py-3">
                        <div>{row.reviewer.email}</div>
                        <div className="dashboard-v2-caption mt-1 text-[#8D96B5]">
                          {RELATION_STATUS_LABELS[row.relationStatus]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{formatDate(date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`dashboard-v2-caption ${hourStateClass(state.tone)}`}>
                          {state.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="dashboard-v2-text text-[#6B7894]">
          Страница {Math.min(page, totalPages)} из {totalPages}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: Math.max(1, page - 1) }, { resetPage: false })}
          >
            Назад
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => updateQuery({ page: Math.min(totalPages, page + 1) }, { resetPage: false })}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupervisionCandidatesPage() {
  return (
    <ProtectedRoute>
      <AdminSupervisionCandidatesContent />
    </ProtectedRoute>
  );
}
