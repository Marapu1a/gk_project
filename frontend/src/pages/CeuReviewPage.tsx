import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminIdentityFilterInput } from '@/components/AdminIdentityFilterInput';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { Button } from '@/components/Button';
import { CopyEmailLink } from '@/components/CopyEmailLink';
import { DashboardDateInput } from '@/components/DashboardDateInput';
import { PageNav } from '@/components/PageNav';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import {
  formatDateRu as formatDate,
  formatDateTimeRu as formatDateTime,
} from '@/utils/dateFormat';
import { AdminCeuDetailsModal } from '@/features/admin/components/AdminCeuDetailsModal';
import { useAdminCeuHistory } from '@/features/admin/hooks/ceu/useAdminCeuHistory';
import {
  downloadAdminCeuHistoryCsv,
  type AdminCeuHistoryRow,
  type AdminCeuCategory,
  type AdminCeuSortBy,
  type AdminCeuSortDir,
  type AdminCeuStatus,
} from '@/features/admin/api/ceu/getAdminCeuHistory';
import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';

const cycleFilters = [
  '',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'ресертификация',
];

const CATEGORY_VALUES = new Set<AdminCeuCategory | 'ALL'>([
  'ALL',
  'ETHICS',
  'CULTURAL_DIVERSITY',
  'SUPERVISION',
  'GENERAL',
]);
const STATUS_VALUES = new Set<AdminCeuStatus | 'ALL'>([
  'ALL',
  'UNCONFIRMED',
  'CONFIRMED',
  'REJECTED',
  'SPENT',
]);
const SORT_VALUES = new Set<AdminCeuSortBy>([
  'createdAt',
  'eventDate',
  'email',
  'group',
  'category',
  'status',
  'points',
]);

function statusTone(status: AdminCeuStatus): StatusPillTone {
  if (status === 'CONFIRMED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'SPENT') return 'neutral';
  return 'info';
}

function categoryLabel(category: AdminCeuHistoryRow['category']) {
  return category === 'MULTIPLE' ? 'Несколько (см. детали)' : ceuCategoryLabels[category] ?? category;
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ceu_history_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CeuReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRow, setSelectedRow] = useState<AdminCeuHistoryRow | null>(null);

  const rawCategory = searchParams.get('category');
  const rawStatus = searchParams.get('status');
  const rawSortBy = searchParams.get('sortBy');
  const rawSortDir = searchParams.get('sortDir');

  const createdFrom = searchParams.get('createdFrom') ?? '';
  const createdTo = searchParams.get('createdTo') ?? '';
  const search = searchParams.get('search') ?? '';
  const group = searchParams.get('group') ?? '';
  const category: AdminCeuCategory | 'ALL' = CATEGORY_VALUES.has(rawCategory as AdminCeuCategory | 'ALL')
    ? (rawCategory as AdminCeuCategory | 'ALL')
    : 'ALL';
  const status: AdminCeuStatus | 'ALL' = STATUS_VALUES.has(rawStatus as AdminCeuStatus | 'ALL')
    ? (rawStatus as AdminCeuStatus | 'ALL')
    : 'ALL';
  const sortBy: AdminCeuSortBy = SORT_VALUES.has(rawSortBy as AdminCeuSortBy)
    ? (rawSortBy as AdminCeuSortBy)
    : 'createdAt';
  const sortDir: AdminCeuSortDir = rawSortDir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const perPage = [20, 50, 100, 250, 500].includes(Number(searchParams.get('perPage')))
    ? Number(searchParams.get('perPage'))
    : 100;

  const updateQuery = (
    patch: Record<string, string | number | null | undefined>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams);
    const defaults: Record<string, string> = {
      category: 'ALL',
      status: 'ALL',
      sortBy: 'createdAt',
      sortDir: 'desc',
      page: '1',
      perPage: '100',
    };

    Object.entries(patch).forEach(([key, value]) => {
      const stringValue = value == null ? '' : String(value);
      if (!stringValue || stringValue === (defaults[key] ?? '')) {
        next.delete(key);
      } else {
        next.set(key, stringValue);
      }
    });

    if (options.resetPage !== false && !('page' in patch)) {
      next.delete('page');
    }

    setSearchParams(next, { replace: options.replace ?? true });
  };

  const params = useMemo(
    () => ({
      createdFrom,
      createdTo,
      search: search.trim(),
      group,
      category,
      status,
      sortBy,
      sortDir,
      page,
      perPage,
    }),
    [category, createdFrom, createdTo, group, page, perPage, search, sortBy, sortDir, status],
  );

  const { data, isLoading, error, isFetching } = useAdminCeuHistory(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const setSort = (nextSortBy: AdminCeuSortBy) => {
    if (sortBy === nextSortBy) {
      updateQuery({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    updateQuery({ sortBy: nextSortBy, sortDir: nextSortBy === 'createdAt' ? 'desc' : 'asc' });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const exportCsv = async () => {
    try {
      const blob = await downloadAdminCeuHistoryCsv(params);
      downloadBlob(blob);
      toast.success('CSV выгружен по выбранным фильтрам');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось выгрузить CSV');
    }
  };

  return (
    <div className="container-fixed mx-auto px-2 py-4 text-blue-dark sm:px-6">
      <header className="mb-5">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="dashboard-v2-page-title text-center">Проверка CEU</h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <PageNav />
          <h1 className="dashboard-v2-page-title text-center">Проверка CEU</h1>
          <div />
        </div>
      </header>

      <section className="card-section space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="dashboard-v2-text text-[#6B7894]">
            Найдено: <span className="font-extrabold text-[#1F305E]">{total}</span>
            {isFetching && !isLoading ? <span className="ml-2">обновляю...</span> : null}
          </div>
          <Button type="button" variant="ghost" onClick={exportCsv} disabled={!total}>
            CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="dashboard-v2-small block text-[#1F305E]">
            Добавлено с
            <DashboardDateInput
              value={createdFrom}
              onChange={(value) => updateQuery({ createdFrom: value }, { replace: true })}
              className="mt-1 h-[36px]"
              ariaLabel="Добавлено с"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Добавлено по
            <DashboardDateInput
              value={createdTo}
              onChange={(value) => updateQuery({ createdTo: value }, { replace: true })}
              className="mt-1 h-[36px]"
              ariaLabel="Добавлено по"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Пользователь
            <AdminIdentityFilterInput
              value={search}
              onChange={(value) => updateQuery({ search: value }, { replace: true })}
              className="mt-1"
              placeholder="Введите ФИО, email, телефон или рег. номер"
              ariaLabel="Поиск пользователя"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Цикл / цель
            <select
              value={group}
              onChange={(event) => updateQuery({ group: event.target.value })}
              className="input-design mt-1"
            >
              {cycleFilters.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? item[0].toUpperCase() + item.slice(1) : 'Все циклы'}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Категория
            <select
              value={category}
              onChange={(event) => updateQuery({ category: event.target.value })}
              className="input-design mt-1"
            >
              <option value="ALL">Все категории</option>
              <option value="ETHICS">Этика</option>
              <option value="CULTURAL_DIVERSITY">Культурное разнообразие</option>
              <option value="SUPERVISION">Супервизия</option>
              <option value="GENERAL">Общие</option>
            </select>
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Статус
            <select
              value={status}
              onChange={(event) => updateQuery({ status: event.target.value })}
              className="input-design mt-1"
            >
              <option value="ALL">Все статусы</option>
              <option value="UNCONFIRMED">Не подтверждено</option>
              <option value="CONFIRMED">Подтверждено</option>
              <option value="REJECTED">Отклонено</option>
              <option value="SPENT">Использовано</option>
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
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Загрузка CEU...</p>
        ) : error ? (
          <p className="dashboard-v2-text p-6 text-[var(--color-danger)]">Не удалось загрузить CEU.</p>
        ) : rows.length === 0 ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Записей не найдено.</p>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="dashboard-v2-text w-full min-w-[1080px] table-fixed text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="w-[132px] rounded-l-[8px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('createdAt')} className="font-medium">
                      Добавлено {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[240px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('email')} className="font-medium">
                      Пользователь {sortBy === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[210px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('group')} className="font-medium">
                      Цикл {sortBy === 'group' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[130px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('category')} className="font-medium">
                      Категория {sortBy === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[60px] px-2 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('points')} className="font-medium">
                      Баллы {sortBy === 'points' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[140px] px-2 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('status')} className="font-medium">
                      Статус {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[78px] px-2 py-3 text-center font-medium">Файл</th>
                  <th className="w-[50px] rounded-r-[8px] px-2 py-3 font-medium" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.entryId}
                    className="group border-b border-[#DCE8EC] align-top transition-colors hover:bg-white/70 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div>{formatDateTime(row.recordCreatedAt)}</div>
                      <div className="dashboard-v2-caption mt-1 text-[#8D96B5]">
                        событие: {formatDate(row.eventDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminUserNameLink
                        userId={row.userId}
                        fullName={row.fullName}
                        email={row.email}
                        className="block truncate font-extrabold"
                      />
                      <CopyEmailLink
                        email={row.email}
                        className="dashboard-v2-caption mt-1 block max-w-full truncate text-left text-[#1F305E] underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </CopyEmailLink>
                    </td>
                    <td className="px-4 py-3">{row.cycleLabel || '-'}</td>
                    <td className="px-4 py-3">{categoryLabel(row.category)}</td>
                    <td className="px-2 py-3 text-center font-extrabold">{row.points}</td>
                    <td className="px-2 py-3 text-center">
                      <StatusPill
                        tone={statusTone(row.status)}
                        size="custom"
                        className="dashboard-v2-caption max-w-full px-3 py-1 text-center leading-tight"
                      >
                        {recordStatusLabels[row.status] ?? row.status}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {row.file ? (
                        <a
                          href={`/uploads/${row.file.fileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-v2-caption text-[#1F305E] underline-offset-2 hover:underline"
                        >
                          Открыть
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <ActionArrowButton
                        onClick={() => setSelectedRow(row)}
                        size={31}
                        title="Открыть детали CEU"
                        aria-label="Открыть детали CEU"
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
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => updateQuery({ page: nextPage }, { resetPage: false })}
        />
      </div>

      {selectedRow ? (
        <AdminCeuDetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </div>
  );
}
