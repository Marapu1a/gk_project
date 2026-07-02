import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { AdminIdentityFilterInput } from '@/components/AdminIdentityFilterInput';
import { useAllDocReviewRequests } from '../hooks/useAllDocReviewRequests';
import { documentReviewStatusLabels } from '@/utils/documentReviewStatusLabels';

type RequestRow = {
  id: string;
  cycleId?: string | null;
  status: string;
  comment?: string | null;
  submittedAt: string;
  user?: { id?: string | null; email?: string | null; fullName?: string | null } | null;
  cycle?: { id: string; status: string; type: string; targetLevel: string; startedAt?: string | null } | null;
  documents?: unknown[];
  documentFiles?: { id: string; status: string; deletionRequestedAt?: string | null }[];
};

const activeStatuses = new Set(['UNCONFIRMED', 'PARTIALLY_CONFIRMED']);
const statusWeight: Record<string, number> = {
  UNCONFIRMED: 0,
  PARTIALLY_CONFIRMED: 1,
  REJECTED: 2,
  CONFIRMED: 3,
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function statusClass(status: string) {
  if (status === 'CONFIRMED') return 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]';
  if (status === 'REJECTED') return 'bg-[rgba(255,83,100,0.18)] text-[var(--color-danger)]';
  if (status === 'PARTIALLY_CONFIRMED') return 'bg-[#C9D8FF] text-[var(--color-blue-dark)]';
  return 'bg-[#E7E9EF] text-[#6B7894]';
}

function archiveLabel(request: RequestRow) {
  if (!request.cycleId) return 'Старая заявка';
  if (request.cycle?.status && request.cycle.status !== 'ACTIVE') return 'Предыдущий цикл';
  return null;
}

export function AdminDocumentReviewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? searchParams.get('email') ?? '';
  const urlMode = searchParams.get('mode') === 'history' ? 'history' : 'active';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [search, setSearch] = useState(urlSearch.trim());
  const [mode, setMode] = useState<'active' | 'history'>(urlMode);

  const { data: requests = [], isLoading, error } = useAllDocReviewRequests(search);

  useEffect(() => {
    setSearchInput(urlSearch);
    setSearch(urlSearch.trim());
  }, [urlSearch]);

  useEffect(() => {
    setMode(urlMode);
  }, [urlMode]);

  const rows = useMemo(() => {
    return (requests as RequestRow[])
      .filter((request) => {
        const isActive = activeStatuses.has(request.status);
        if (mode === 'active' && !isActive) return false;
        if (mode === 'history' && isActive) return false;
        return true;
      })
      .sort((a, b) => {
        const weightDiff = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [mode, requests]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    const next = new URLSearchParams(searchParams);
    next.delete('email');
    if (nextSearch) {
      next.set('search', nextSearch);
    } else {
      next.delete('search');
    }
    setSearch(nextSearch);
    setSearchParams(next, { replace: true });
  };

  const handleModeChange = (nextMode: 'active' | 'history') => {
    setMode(nextMode);
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

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block text-[13px] font-semibold">
              Поиск
              <AdminIdentityFilterInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="ФИО, email, телефон, рег. номер"
                className="mt-1 w-full sm:w-[320px]"
                inputClassName="h-[36px]"
                ariaLabel="Поиск по пользователю"
              />
            </label>
            <button
              type="submit"
              className="btn h-[36px] rounded-[10px] bg-[var(--color-blue-dark)] px-6 text-[14px] font-extrabold text-white"
            >
              Поиск
            </button>
          </form>
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
                    <th className="px-4 py-3">ФИО</th>
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
                            <span
                              className={`inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold ${statusClass(request.status)}`}
                            >
                              {documentReviewStatusLabels[request.status] || request.status}
                            </span>
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
