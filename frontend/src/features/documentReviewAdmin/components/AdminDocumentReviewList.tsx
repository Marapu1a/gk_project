import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { AdminIdentityFilterInput } from '@/components/AdminIdentityFilterInput';
import { useAllDocReviewRequests } from '../hooks/useAllDocReviewRequests';
import { NameSortButton, nextNameSortDirection, sortByFullName, type NameSortDirection } from '@/components/NameSortButton';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import { formatDateRu as formatDate } from '@/utils/dateFormat';

type RequestRow = {
  id: string;
  cycleId?: string | null;
  status: string;
  reviewState: 'OPEN' | 'COMPLETED';
  comment?: string | null;
  submittedAt: string;
  user?: { id?: string | null; email?: string | null; fullName?: string | null } | null;
  cycle?: { id: string; status: string; type: string; targetLevel: string; startedAt?: string | null } | null;
  documents?: unknown[];
  documentFiles?: { id: string; status: string; deletionRequestedAt?: string | null }[];
};

const statusWeight: Record<string, number> = {
  UNCONFIRMED: 0,
  PARTIALLY_CONFIRMED: 1,
  REJECTED: 2,
  CONFIRMED: 3,
};

function statusTone(status: string): StatusPillTone {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PARTIALLY_CONFIRMED') return 'partial';
  return 'neutral';
}

function requestStatusLabel(request: RequestRow) {
  if (request.reviewState === 'COMPLETED') return 'Завершена';
  if (request.status === 'REJECTED') return 'Нужны документы';
  if (request.status === 'CONFIRMED') return 'Завершите проверку';
  return 'На проверке';
}

function requestStatusTone(request: RequestRow): StatusPillTone {
  if (request.reviewState === 'COMPLETED') return 'success';
  if (request.status === 'REJECTED') return 'danger';
  if (request.status === 'CONFIRMED') return 'partial';
  return statusTone(request.status);
}

function archiveLabel(request: RequestRow) {
  if (!request.cycleId) return 'Старая заявка';
  if (request.cycle?.status && request.cycle.status !== 'ACTIVE') return 'Предыдущий цикл';
  return null;
}

export function AdminDocumentReviewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? searchParams.get('email') ?? '';
  const mode = searchParams.get('mode') === 'history' ? 'history' : 'active';
  const [nameSort, setNameSort] = useState<NameSortDirection>(null);

  const { data: requests = [], isLoading, error } = useAllDocReviewRequests(search.trim());

  const rows = useMemo(() => {
    const filteredRows = (requests as RequestRow[])
      .filter((request) => {
        const isActive = request.reviewState !== 'COMPLETED';
        if (mode === 'active' && !isActive) return false;
        if (mode === 'history' && isActive) return false;
        return true;
      })
      .sort((a, b) => {
        const weightDiff = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
    return sortByFullName(filteredRows, (request) => request.user?.fullName || request.user?.email, nameSort);
  }, [mode, nameSort, requests]);

  const handleSearchChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('email');
    if (value) {
      next.set('search', value);
    } else {
      next.delete('search');
    }
    setSearchParams(next, { replace: true });
  };

  const handleModeChange = (nextMode: 'active' | 'history') => {
    const next = new URLSearchParams(searchParams);
    if (nextMode === 'active') {
      next.delete('mode');
    } else {
      next.set('mode', nextMode);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="text-[var(--color-blue-dark)]">
      <section className="mx-auto max-w-[1180px] overflow-hidden rounded-[18px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <header className="flex flex-col gap-4 border-b border-[var(--color-blue-soft)] px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight">
              Заявки на проверку документов ({rows.length}/{(requests as RequestRow[]).length})
            </h1>
            <div className="mt-4 inline-flex rounded-[10px] bg-[#F0F0F0] p-1">
              <ModeButton active={mode === 'active'} onClick={() => handleModeChange('active')}>
                Активные
              </ModeButton>
              <ModeButton active={mode === 'history'} onClick={() => handleModeChange('history')}>
                История
              </ModeButton>
            </div>
          </div>

          <label className="block text-[13px] font-semibold">
            Поиск
            <AdminIdentityFilterInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Введите ФИО, email, телефон или рег. номер"
              className="mt-1 w-full sm:w-[380px]"
              inputClassName="h-[36px]"
              ariaLabel="Поиск по пользователю"
            />
          </label>
        </header>

        <div className="px-6 py-6">
          {isLoading ? (
            <p className="text-[14px]">Загрузка...</p>
          ) : error ? (
            <p className="text-[var(--color-danger)]">Ошибка загрузки</p>
          ) : rows.length === 0 ? (
            <p className="rounded-[12px] bg-[#F7F8FA] px-4 py-5 text-[14px] text-[#6B7894]">
              Заявок нет.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-separate border-spacing-0 text-[14px]">
                <thead>
                  <tr className="bg-[var(--color-blue-soft)] text-left">
                    <th className="rounded-l-[10px] px-4 py-3">Email</th>
                    <th className="px-4 py-3">
                      <NameSortButton
                        direction={nameSort}
                        onClick={() => setNameSort((current) => nextNameSortDirection(current))}
                      />
                    </th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Файлы</th>
                    <th className="px-4 py-3">Дата</th>
                    <th className="rounded-r-[10px] px-4 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => {
                    const filesCount = request.documentFiles?.length || request.documents?.length || 0;
                    const archive = archiveLabel(request);
                    const deletionRequestsCount =
                      request.documentFiles?.filter(
                        (file) => file.deletionRequestedAt && file.status !== 'DELETED',
                      ).length ?? 0;

                    return (
                      <tr
                        key={request.id}
                        className="group border-b border-[var(--color-blue-soft)] transition-colors hover:bg-white/70"
                      >
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4">
                          {request.user?.email || '—'}
                        </td>
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4">
                          {request.user?.id ? (
                            <AdminUserNameLink
                              userId={request.user.id}
                              fullName={request.user.fullName}
                              email={request.user.email}
                              className="font-medium text-[var(--color-blue-dark)]"
                            >
                              {request.user?.fullName || request.user?.email || 'Профиль пользователя'}
                            </AdminUserNameLink>
                          ) : (
                            request.user?.fullName || '—'
                          )}
                        </td>
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill
                              tone={requestStatusTone(request)}
                              size="md"
                              className="h-[26px]"
                            >
                              {requestStatusLabel(request)}
                            </StatusPill>
                            {archive ? (
                              <span className="inline-flex h-[24px] items-center rounded-full bg-[#EEF0F4] px-2.5 text-[11px] font-bold text-[#8D96B5]">
                                {archive}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{filesCount}</span>
                            {deletionRequestsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,83,100,0.12)] px-2 py-1 text-[12px] font-extrabold text-[var(--color-danger)]">
                                ! {deletionRequestsCount}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4">
                          {formatDate(request.submittedAt)}
                        </td>
                        <td className="border-b border-[var(--color-blue-soft)] px-4 py-4 text-right">
                          <Link
                            to={`/admin/document-review/${request.id}`}
                            className="btn h-[34px] rounded-full bg-[var(--color-blue-dark)] px-5 text-[13px] font-extrabold text-white"
                          >
                            Детали
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn h-[34px] rounded-[8px] px-5 text-[14px] font-extrabold ${
        active ? 'bg-white text-[var(--color-blue-dark)] shadow-sm' : 'text-[#8D96B5]'
      }`}
    >
      {children}
    </button>
  );
}
