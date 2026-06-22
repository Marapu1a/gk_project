import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { Button } from '@/components/Button';
import { PageNav } from '@/components/PageNav';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { AdminNotifyChoiceModal } from '@/features/admin/components/AdminNotifyChoiceModal';
import { useAdminCeuHistory } from '@/features/admin/hooks/ceu/useAdminCeuHistory';
import {
  downloadAdminCeuHistoryCsv,
  type AdminCeuHistoryRow,
  type AdminCeuCategory,
  type AdminCeuSortBy,
  type AdminCeuSortDir,
  type AdminCeuStatus,
} from '@/features/admin/api/ceu/getAdminCeuHistory';
import { useUpdateCEUEntry } from '@/features/ceu/hooks/useUpdateCeuEntry';
import { displayCeuEventName } from '@/features/ceu/utils/displayCeuEventName';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

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

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: AdminCeuStatus) {
  if (status === 'CONFIRMED') return 'bg-[var(--color-green-brand)] text-white';
  if (status === 'REJECTED') return 'bg-[var(--color-danger)] text-white';
  if (status === 'SPENT') return 'bg-[#EEF0F4] text-[#6B7894]';
  return 'bg-[var(--color-blue-soft)] text-[#1F305E]';
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
    <div className="container-fixed mx-auto px-5 py-4 text-blue-dark sm:px-6">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PageNav />
        <h1 className="dashboard-v2-page-title text-center">Проверка CEU</h1>
        <div />
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
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => updateQuery({ createdFrom: event.target.value }, { replace: true })}
              className="input-design mt-1"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Добавлено по
            <input
              type="date"
              value={createdTo}
              onChange={(event) => updateQuery({ createdTo: event.target.value }, { replace: true })}
              className="input-design mt-1"
            />
          </label>

          <label className="dashboard-v2-small block text-[#1F305E]">
            Пользователь
            <input
              value={search}
              onChange={(event) => updateQuery({ search: event.target.value }, { replace: true })}
              className="input-design mt-1"
              placeholder="ФИО или email"
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
          <div className="p-5">
            <table className="dashboard-v2-text w-full table-fixed text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="w-[56px] rounded-l-[8px] px-4 py-3 font-medium" />
                  <th className="w-[132px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('createdAt')} className="font-medium">
                      Добавлено {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('email')} className="font-medium">
                      Пользователь {sortBy === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[190px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('group')} className="font-medium">
                      Цикл {sortBy === 'group' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[185px] px-4 py-3 font-medium">
                    <button type="button" onClick={() => setSort('category')} className="font-medium">
                      Категория {sortBy === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[84px] px-4 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('points')} className="font-medium">
                      Баллы {sortBy === 'points' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[150px] px-4 py-3 text-center font-medium">
                    <button type="button" onClick={() => setSort('status')} className="font-medium">
                      Статус {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[94px] rounded-r-[8px] px-4 py-3 text-center font-medium">Файл</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.entryId}
                    className="group border-b border-[#DCE8EC] align-top transition-colors hover:bg-white/70 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <ActionArrowButton
                        onClick={() => setSelectedRow(row)}
                        title="Открыть детали CEU"
                        aria-label="Открыть детали CEU"
                      />
                    </td>
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
                      <a
                        href={`mailto:${row.email}`}
                        className="dashboard-v2-caption mt-1 block truncate text-[#1F305E] underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">{row.cycleLabel || '-'}</td>
                    <td className="px-4 py-3">{categoryLabel(row.category)}</td>
                    <td className="px-4 py-3 text-center font-extrabold">{row.points}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`dashboard-v2-caption inline-flex rounded-full px-3 py-1 ${statusClass(row.status)}`}
                      >
                        {recordStatusLabels[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
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

function AdminCeuDetailsModal({
  row,
  onClose,
}: {
  row: AdminCeuHistoryRow;
  onClose: () => void;
}) {
  const mutation = useUpdateCEUEntry(row.userId, row.email);
  const [rejectedReason, setRejectedReason] = useState(row.rejectedReason ?? '');
  const [deleteFile, setDeleteFile] = useState(false);
  const [pendingAction, setPendingAction] = useState<'CONFIRM' | 'REJECT' | null>(null);
  const isSpent = row.status === 'SPENT';
  const canConfirm = row.status === 'REJECTED';
  const canReject = !isSpent && !canConfirm;

  const requestConfirm = () => {
    setPendingAction('CONFIRM');
  };

  const requestReject = () => {
    const reason = rejectedReason.trim();
    if (!reason) {
      toast.error(UI_TOAST_MESSAGES.ceu.rejectReasonRequired);
      return;
    }
    setPendingAction('REJECT');
  };

  const confirm = async (notifyUser: boolean) => {
    try {
      await mutation.mutateAsync({ id: row.entryId, status: 'CONFIRMED', notifyUser });
      toast.success(UI_TOAST_MESSAGES.ceu.confirmed);
      setPendingAction(null);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.ceu.confirmFailed);
    }
  };

  const reject = async (notifyUser: boolean) => {
    const reason = rejectedReason.trim();
    if (!reason) {
      toast.error(UI_TOAST_MESSAGES.ceu.rejectReasonRequired);
      return;
    }

    try {
      await mutation.mutateAsync({
        id: row.entryId,
        status: 'REJECTED',
        rejectedReason: reason,
        deleteFile,
        notifyUser,
      });
      toast.success(
        deleteFile
          ? UI_TOAST_MESSAGES.ceu.rejectedWithFileDeleted
          : UI_TOAST_MESSAGES.ceu.rejected,
      );
      setPendingAction(null);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.ceu.rejectFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Детали CEU</h3>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Всего баллов" value={formatNumber(row.points)} />
              <ReadOnlyField label="Дата мероприятия" value={formatDate(row.eventDate)} />
            </div>

            <div>
              <div className="dashboard-v2-small mb-2 font-semibold text-[#1F305E]">
                Начисленные баллы
              </div>
              <div className="overflow-hidden rounded-[10px] border border-[#DCE8EC]">
                {row.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-3 border-b border-[#DCE8EC] px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,190px)_48px_minmax(0,1fr)]"
                  >
                    <span className="dashboard-v2-small min-w-0 break-words pr-2 font-semibold leading-[1.25] text-[#1F305E]">
                      {ceuCategoryLabels[entry.category] ?? entry.category}
                    </span>
                    <span className="dashboard-v2-small font-extrabold text-[#1F305E]">
                      {formatNumber(entry.value)}
                    </span>
                    <span className="dashboard-v2-caption leading-snug text-[#6B7894]">
                      {entry.activityType ? activityTypeLabel(entry.activityType) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <AdminCeuFilePreview file={row.file} />
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Название или ведущий тренинга"
              value={displayCeuEventName(row.eventName)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyPlain label="Специалист" value={row.fullName || '-'} mutedLabel />
              <ReadOnlyPlain label="Email" value={row.email || '-'} mutedLabel />
            </div>

            <ReadOnlyPlain label="Цикл" value={row.cycleLabel || '-'} mutedLabel />

            <div className="rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-center dashboard-v2-label text-[#1F305E]">
              {recordStatusLabels[row.status] ?? row.status}
            </div>

            {row.reviewer ? (
              <div className="dashboard-v2-caption text-[#8D96B5]">
                Проверил: {row.reviewer.email}
                {row.reviewedAt ? `, ${formatDateTime(row.reviewedAt)}` : ''}
              </div>
            ) : null}

            {row.rejectedReason && !canReject ? (
              <div className="dashboard-v2-text rounded-[10px] bg-white px-4 py-3 text-[var(--color-danger)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                {row.rejectedReason}
              </div>
            ) : null}

            {canReject ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="dashboard-v2-small mb-1 block text-[#1F305E]">
                    Причина отклонения
                  </span>
                  <textarea
                    className="input-design min-h-[96px] resize-y"
                    value={rejectedReason}
                    onChange={(event) => setRejectedReason(event.target.value)}
                    maxLength={COMMENT_MAX_LENGTH}
                    placeholder="Например: прикреплён неверный сертификат"
                  />
                </label>

                {row.file ? (
                  <label className="dashboard-v2-caption flex cursor-pointer items-center gap-2 text-[#1F305E]">
                    <input
                      type="checkbox"
                      checked={deleteFile}
                      onChange={(event) => setDeleteFile(event.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                    />
                    Удалить файл у всей заявки CEU
                  </label>
                ) : null}
                {deleteFile ? (
                  <p className="dashboard-v2-caption text-[#8D96B5]">
                    Вся заявка будет отклонена с этим комментарием, потому что файл общий.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {!isSpent ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {canConfirm ? (
              <button
                type="button"
                onClick={requestConfirm}
                disabled={mutation.isPending}
                className="btn btn-dark dashboard-v2-label h-[42px] min-w-[140px] rounded-full px-6 disabled:bg-[#B7BFCE]"
              >
                Подтвердить
              </button>
            ) : (
              <button
                type="button"
                onClick={requestReject}
                disabled={mutation.isPending}
                className="btn btn-dark dashboard-v2-label h-[42px] min-w-[150px] rounded-full px-6 disabled:bg-[#B7BFCE]"
              >
                Отклонить как ошибочную
              </button>
            )}
          </div>
        ) : null}

        {pendingAction ? (
          <AdminNotifyChoiceModal
            title={
              pendingAction === 'CONFIRM'
                ? 'Подтвердить CEU-баллы?'
                : deleteFile
                  ? 'Отклонить CEU и удалить файл?'
                  : 'Отклонить CEU как ошибочную?'
            }
            message="Отправить пользователю уведомление об этом действии?"
            danger={pendingAction === 'REJECT'}
            isPending={mutation.isPending}
            onClose={() => setPendingAction(null)}
            onChoose={(notify) =>
              pendingAction === 'CONFIRM' ? void confirm(notify) : void reject(notify)
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function activityTypeLabel(value: string) {
  const labels: Record<string, string> = {
    TRAINING_ATTENDANCE:
      'Участие в онлайн- или очных семинарах, воркшопах и тренингах по прикладному анализу поведения (ПАП) или смежным направлениям поведенческого анализа',
    PRESENTATION:
      'Проведение семинара, воркшопа или тренинга по прикладному анализу поведения (ПАП) или смежным направлениям',
    PUBLICATION:
      'Публикация материалов по прикладному анализу поведения или смежным направлениям',
    TEACHING:
      'Преподавание курсов, соответствующих содержательным требованиям и компетенциям уровней Инструктор/Супервизор',
  };
  return labels[value] ?? value;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dashboard-v2-small mb-1 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-caption min-h-[32px] rounded-[8px] bg-[#EFF1F5] px-3 py-2 text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function ReadOnlyPlain({
  label,
  value,
  mutedLabel = false,
}: {
  label: string;
  value: string;
  mutedLabel?: boolean;
}) {
  return (
    <div>
      <div className={`dashboard-v2-small mb-1 ${mutedLabel ? 'text-[#A7B1C7]' : 'text-[#1F305E]'}`}>
        {label}
      </div>
      <div className="dashboard-v2-caption leading-snug text-[#1F305E]">{value}</div>
    </div>
  );
}

function AdminCeuFilePreview({ file }: { file: AdminCeuHistoryRow['file'] }) {
  if (!file) {
    return (
      <div className="dashboard-v2-caption rounded-[10px] bg-white px-4 py-5 text-[#6B7894] shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        Файл не прикреплён
      </div>
    );
  }

  const fileUrl = `/uploads/${file.fileId}`;
  const isImage = file.mimeType.startsWith('image/');

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-4 rounded-[10px] bg-white px-3 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[4px] border border-[#DCE3EF] bg-white dashboard-v2-caption font-bold text-[#A7B1C7]">
        {isImage ? (
          <img src={fileUrl} alt="" className="h-full w-full rounded-[4px] object-cover" />
        ) : (
          'PDF'
        )}
      </div>
      <div className="dashboard-v2-caption min-w-0 truncate text-[#1F305E]" title={file.name}>
        {file.name}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="btn dashboard-v2-caption h-[34px] rounded-full border border-[#1F305E] px-4 font-semibold text-[#1F305E]"
      >
        Открыть
      </a>
    </div>
  );
}
