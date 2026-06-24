import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { DashboardDateInput } from '@/components/DashboardDateInput';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageNav } from '@/components/PageNav';
import { Button } from '@/components/Button';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { AdminNotifyChoiceModal } from '@/features/admin/components/AdminNotifyChoiceModal';
import { useAdminReviewerCandidates } from '@/features/admin/hooks/supervision/useAdminReviewerCandidates';
import { useRemovePendingReviewerHours } from '@/features/admin/hooks/supervision/useRemovePendingReviewerHours';
import type {
  AdminReviewerCandidateKind,
  AdminReviewerCandidateRow,
  AdminReviewerCandidateSortBy,
  AdminReviewerCandidateSortDir,
  AdminReviewerHourState,
} from '@/features/admin/api/supervision/getAdminReviewerCandidates';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

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
  { value: 'CONFIRMED_BY_REVIEWER', label: 'Подтверждены проверяющим' },
  { value: 'REJECTED_BY_REVIEWER', label: 'Отклонены проверяющим' },
  { value: 'REJECTED_BY_ADMIN', label: 'Убраны администратором' },
  { value: 'ADMIN_CORRECTION', label: 'Корректировки администратора' },
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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value?: number | null) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function candidateName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

const HOUR_LABELS: Record<string, string> = {
  INSTRUCTOR: 'Практика',
  CURATOR: 'Практика',
  PRACTICE: 'Практика',
  IMPLEMENTING: 'Полевая практика',
  PROGRAMMING: 'Работа с информацией',
  SUPERVISOR: 'Менторские часы',
  SUPERVISION: 'Менторские часы',
};

function hourState(row: AdminReviewerCandidateRow): { text: string; tone: HourStateTone } {
  if (row.rowType === 'ADMIN_CORRECTION') {
    return { text: 'Корректировка администратора', tone: 'normal' };
  }

  if (row.pendingCount > 0) {
    return { text: `Есть новые часы: ${row.pendingCount}`, tone: 'danger' };
  }

  const review = row.latestReview;
  if (review) {
    const action = review.status === 'REJECTED' ? 'Отклонено' : 'Подтверждено';
    if (review.reviewedByAdmin && review.reviewedBy?.email) {
      return {
        text:
          review.status === 'REJECTED'
            ? `Удалено администратором: ${review.reviewedBy.email}`
            : `${action} администратором: ${review.reviewedBy.email}`,
        tone: review.status === 'REJECTED' ? 'muted' : 'success',
      };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRow, setSelectedRow] = useState<AdminReviewerCandidateRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminReviewerCandidateRow | null>(null);
  const removePendingHours = useRemovePendingReviewerHours();

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
  const perPage = [20, 50, 100, 250, 500].includes(Number(searchParams.get('perPage')))
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

  const removePending = async (notifyUser: boolean) => {
    if (!removeTarget) return;

    try {
      const result = await removePendingHours.mutateAsync({
        relationId: removeTarget.relationId,
        notifyUser,
      });
      toast.success(
        notifyUser
          ? `${UI_TOAST_MESSAGES.admin.pendingHoursRemovedNotify} (${result.removedRecordsCount})`
          : `${UI_TOAST_MESSAGES.admin.pendingHoursRemovedQuiet} (${result.removedRecordsCount})`,
      );
      setSelectedRow(null);
      setRemoveTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.admin.pendingHoursRemoveFailed);
    }
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
            <DashboardDateInput
              value={createdFrom}
              onChange={(value) => updateQuery({ createdFrom: value }, { replace: true })}
              className="mt-1 h-[36px]"
              ariaLabel="Часы добавлены с"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Часы добавлены по
            <DashboardDateInput
              value={createdTo}
              onChange={(value) => updateQuery({ createdTo: value }, { replace: true })}
              className="mt-1 h-[36px]"
              ariaLabel="Часы добавлены по"
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

          <div className="flex items-end">
            <PageSizeSelect
              value={perPage}
              onChange={(value) => updateQuery({ perPage: value })}
              className="h-[38px]"
            />
          </div>

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
          <div className="p-5">
            <table className="dashboard-v2-text w-full table-fixed text-[#1F305E]">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[21%]" />
                <col className="w-[23%]" />
                <col className="w-[13%]" />
                <col className="w-[18%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="rounded-l-[8px] px-3 py-3 font-medium">
                    <button type="button" onClick={() => setSort('candidate')} className="font-medium">
                      ФИО {sortBy === 'candidate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" onClick={() => setSort('candidateEmail')} className="font-medium">
                      Email кандидата {sortBy === 'candidateEmail' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" onClick={() => setSort('reviewerEmail')} className="font-medium">
                      Назначенный проверяющий {sortBy === 'reviewerEmail' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('createdAt')} className="font-medium">
                      Последние добавленные {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('status')} className="font-medium">
                      Состояние часов {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="rounded-r-[8px] px-3 py-3 text-center font-medium" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const date = row.latestPendingRequestAt ?? row.latestRequestAt;
                  const state = hourState(row);

                  return (
                    <tr
                      key={row.relationId}
                      className={`group border-b border-[#DCE8EC] transition-colors hover:bg-white/70 last:border-b-0 ${
                        row.relationStatus === 'REJECTED' ? 'text-[#8D96B5]' : ''
                      }`}
                    >
                      <td className="break-words px-3 py-3 font-extrabold leading-snug">
                        <AdminUserNameLink
                          userId={row.candidate.id}
                          fullName={row.candidate.fullName}
                          email={row.candidate.email}
                        >
                          {candidateName(row.candidate.fullName, row.candidate.email)}
                        </AdminUserNameLink>
                      </td>
                      <td className="break-all px-3 py-3 leading-snug">{row.candidate.email}</td>
                      <td className="break-all px-3 py-3 leading-snug">
                        <div>
                          {row.rowType === 'ADMIN_CORRECTION'
                            ? row.adminCorrection?.admin?.email ?? row.reviewer.email
                            : row.reviewer.email}
                        </div>
                        <div className="dashboard-v2-caption mt-1 text-[#8D96B5]">
                          {row.rowType === 'ADMIN_CORRECTION'
                            ? 'служебная корректировка'
                            : RELATION_STATUS_LABELS[row.relationStatus]}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{formatDate(date)}</td>
                      <td className="break-words px-3 py-3 text-center leading-snug">
                        <span className={`dashboard-v2-caption ${hourStateClass(state.tone)}`}>
                          {state.text}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ActionArrowButton
                          onClick={() => setSelectedRow(row)}
                          size={31}
                          title="Открыть детали заявки"
                          aria-label="Открыть детали заявки"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5">
        <DashboardPagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => updateQuery({ page: nextPage }, { resetPage: false })}
        />
      </div>

      {selectedRow ? (
        selectedRow.rowType === 'ADMIN_CORRECTION' ? (
          <AdminCorrectionDetailsModal
            row={selectedRow}
            kindLabel={KIND_LABELS[kind]}
            onClose={() => setSelectedRow(null)}
          />
        ) : (
          <AdminPendingHoursDetailsModal
            row={selectedRow}
            kindLabel={KIND_LABELS[kind]}
            isPending={removePendingHours.isPending}
            onClose={() => setSelectedRow(null)}
            onRemove={() => setRemoveTarget(selectedRow)}
          />
        )
      ) : null}

      {removeTarget ? (
        <AdminNotifyChoiceModal
          title="Убрать часы из проверки?"
          message="Часы будут убраны из очереди проверяющего и останутся в истории пользователя с пометкой администратора."
          danger
          isPending={removePendingHours.isPending}
          onClose={() => setRemoveTarget(null)}
          onChoose={(notify) => void removePending(notify)}
        />
      ) : null}
    </div>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dashboard-v2-small mb-1 text-[#8D96B5]">{label}</div>
      <div className="dashboard-v2-caption min-h-[32px] rounded-[8px] bg-[#F3F6F8] px-3 py-2 text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function HoursList({ hours }: { hours: AdminReviewerCandidateRow['pendingRequests'][number]['hours'] }) {
  const total = hours.reduce((sum, hour) => sum + Number(hour.value || 0), 0);

  return (
    <div className="rounded-[10px] bg-white px-3 py-2">
      {hours.map((hour) => (
        <div
          key={hour.id}
          className="flex items-center justify-between gap-4 border-b border-[#DCE8EC] py-2 last:border-b-0"
        >
          <span>{HOUR_LABELS[hour.type] ?? hour.type}</span>
          <span className="font-extrabold">{formatNumber(hour.value)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-2 font-extrabold">
        <span>Всего</span>
        <span>{formatNumber(total)}</span>
      </div>
    </div>
  );
}

function DistributionBlock({
  distribution,
}: {
  distribution: AdminReviewerCandidateRow['pendingRequests'][number]['distribution'];
}) {
  const direct = distribution.directIndividual + distribution.directGroup;
  const nonObserving = distribution.nonObservingIndividual + distribution.nonObservingGroup;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[10px] bg-white px-3 py-2">
        <MiniRow label="С наблюдением" value={direct} strong />
        <MiniRow label="Индивидуально" value={distribution.directIndividual} />
        <MiniRow label="В группе" value={distribution.directGroup} />
      </div>
      <div className="rounded-[10px] bg-white px-3 py-2">
        <MiniRow label="Без наблюдения" value={nonObserving} strong />
        <MiniRow label="Индивидуально" value={distribution.nonObservingIndividual} />
        <MiniRow label="В группе" value={distribution.nonObservingGroup} />
      </div>
    </div>
  );
}

function MiniRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#DCE8EC] py-1.5 last:border-b-0">
      <span>{label}</span>
      <span className={strong ? 'font-extrabold' : 'font-semibold'}>{formatNumber(value)}</span>
    </div>
  );
}

function AdminCorrectionDetailsModal({
  row,
  kindLabel,
  onClose,
}: {
  row: AdminReviewerCandidateRow;
  kindLabel: string;
  onClose: () => void;
}) {
  const correction = row.adminCorrection;
  const admin = correction?.admin?.fullName || correction?.admin?.email || row.reviewer.email || '—';
  const distribution = correction?.distribution ?? {
    directIndividual: 0,
    directGroup: 0,
    nonObservingIndividual: 0,
    nonObservingGroup: 0,
  };
  const practiceTotal = round2((correction?.implementing ?? 0) + (correction?.programming ?? 0));
  const supervisionTotal = round2(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 text-[#1F305E] shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Корректировка администратора</h3>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <CompactField label="Дата корректировки" value={formatDateTime(correction?.updatedAt)} />
          <CompactField label="Кто сделал" value={admin} />
          <CompactField label="Кому сделал" value={candidateName(row.candidate.fullName, row.candidate.email)} />
          <CompactField label="Email кандидата" value={row.candidate.email} />
          <CompactField label="Тип" value={kindLabel} />
          <CompactField
            label="Уведомление"
            value={correction?.notifyUser ? 'Отправлено пользователю' : 'Без уведомления'}
          />
        </div>

        <section className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 dashboard-v2-text">
          <h4 className="dashboard-v2-title mb-3">Что изменено</h4>

          {row.kind === 'mentorship' ? (
            <div className="rounded-[10px] bg-white px-3 py-2">
              <MiniRow label="Итоговые часы менторства" value={correction?.mentor ?? 0} strong />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <div className="rounded-[10px] bg-white px-3 py-2">
                  <MiniRow label="Полевая практика" value={correction?.implementing ?? 0} />
                  <MiniRow label="Работа с информацией" value={correction?.programming ?? 0} />
                  <MiniRow label="Итоговая практика" value={practiceTotal} strong />
                </div>
              </div>

              <div className="space-y-4">
                <DistributionBlock distribution={distribution} />
                <div className="rounded-[10px] bg-white px-3 py-2">
                  <MiniRow label="Итоговая супервизия" value={supervisionTotal} strong />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AdminPendingHoursDetailsModal({
  row,
  kindLabel,
  isPending,
  onClose,
  onRemove,
}: {
  row: AdminReviewerCandidateRow;
  kindLabel: string;
  isPending: boolean;
  onClose: () => void;
  onRemove: () => void;
}) {
  const pendingRequests = row.pendingRequests ?? [];
  const hasPendingRequests = pendingRequests.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 text-[#1F305E] shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Детали заявки на подтверждение часов</h3>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <CompactField label="Кандидат" value={candidateName(row.candidate.fullName, row.candidate.email)} />
          <CompactField label="Email кандидата" value={row.candidate.email} />
          <CompactField label="Назначенный проверяющий" value={row.reviewer.email} />
          <CompactField label="Тип" value={kindLabel} />
          <CompactField label="Последняя заявка" value={formatDate(row.latestPendingRequestAt ?? row.latestRequestAt)} />
          <CompactField label="Состояние" value={hourState(row).text} />
        </div>

        {hasPendingRequests ? (
          <div className="space-y-4">
            {pendingRequests.map((request, index) => (
              <section
                key={request.id}
                className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 dashboard-v2-text"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="dashboard-v2-title">
                    {pendingRequests.length > 1 ? `Заявка ${index + 1}` : 'Заявка'}
                  </h4>
                  <span className="dashboard-v2-caption text-[#8D96B5]">
                    {formatDate(request.createdAt)}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="space-y-4">
                    <HoursList hours={request.hours} />
                    {row.kind === 'supervision' ? (
                      <DistributionBlock distribution={request.distribution} />
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CompactField label="Дата начала" value={formatDate(request.periodStartedAt)} />
                      <CompactField label="Дата окончания" value={formatDate(request.periodEndedAt)} />
                    </div>
                    <CompactField label="Условия практики" value={request.treatmentSetting || '—'} />
                    <div>
                      <div className="dashboard-v2-small mb-1 text-[#8D96B5]">Описание</div>
                      <div className="dashboard-v2-caption min-h-[76px] rounded-[8px] bg-white px-3 py-2 text-[#1F305E]">
                        {request.description || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="dashboard-v2-text rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-5 text-[#6B7894]">
            Сейчас нет часов, ожидающих проверки.
          </div>
        )}

        {hasPendingRequests ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              className="btn dashboard-v2-action dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)] disabled:opacity-50"
            >
              Убрать из проверки
            </button>
          </div>
        ) : null}
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
