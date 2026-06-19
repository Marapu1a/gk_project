import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { PageNav } from '@/components/PageNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import {
  useExternalSupervisorClaims,
  useUpdateExternalSupervisorClaim,
} from '@/features/admin/hooks/useExternalSupervisorClaims';
import type { ExternalSupervisorClaimRow } from '@/features/admin/api/externalSupervisorClaims';

const statusLabels = {
  PENDING: 'Ожидает проверки',
  APPROVED: 'Подтверждено',
  REJECTED: 'Не подтверждено',
} as const;

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function AdminExternalSupervisorClaimsPageInner() {
  const [mode, setMode] = useState<'active' | 'history'>('active');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { data, isLoading, error } = useExternalSupervisorClaims(mode, page, perPage);
  const updateClaim = useUpdateExternalSupervisorClaim();
  const { confirm } = useConfirm();

  const changeMode = (nextMode: 'active' | 'history') => {
    setMode(nextMode);
    setPage(1);
  };

  const decide = async (user: ExternalSupervisorClaimRow, status: 'APPROVED' | 'REJECTED') => {
    const approved = status === 'APPROVED';
    const ok = await confirm({
      title: approved ? 'Подтвердить квалификацию?' : 'Не подтверждать квалификацию?',
      message: approved
        ? 'Перед подтверждением убедитесь, что уровень и дальнейший процесс пользователя настроены в его карточке.'
        : 'После этого пользователь снова сможет самостоятельно выбрать обычную цель сертификации.',
      confirmLabel: approved ? 'Подтвердить' : 'Не подтверждено',
      variant: approved ? 'default' : 'danger',
    });
    if (!ok) return;

    try {
      await updateClaim.mutateAsync({ userId: user.id, status });
      toast.success(approved ? 'Квалификация подтверждена' : 'Обращение закрыто без подтверждения');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обработать обращение');
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / perPage));

  return (
    <div className="container-fixed px-4 pb-10 pt-3 text-blue-dark md:px-6">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PageNav />
        <h1 className="dashboard-v2-page-title text-center">Подтверждение квалификации</h1>
        <div />
      </header>

      <section className="card-section px-5 py-5 shadow-soft md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-[10px] bg-[#F0F0F0] p-1">
            {([
              ['active', 'Ожидают проверки'],
              ['history', 'История'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                className={`btn h-[36px] rounded-[8px] px-5 text-[14px] font-extrabold ${
                  mode === value
                    ? 'bg-white text-blue-dark shadow-sm'
                    : 'text-[#8D96B5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <span className="dashboard-v2-caption text-[#8D96B5]">
              Найдено: <strong className="text-blue-dark">{data?.total ?? 0}</strong>
            </span>
            <PageSizeSelect
              value={perPage}
              onChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      <section className="card-section mt-5 overflow-hidden px-5 py-5 shadow-soft md:px-6">
        {isLoading ? <p className="dashboard-v2-text py-10 text-center">Загрузка...</p> : null}
        {error ? (
          <p className="dashboard-v2-text py-10 text-center text-[var(--color-danger)]">
            Не удалось загрузить обращения
          </p>
        ) : null}
        {!isLoading && !error && !data?.users.length ? (
          <p className="dashboard-v2-text py-10 text-center text-[#8D96B5]">
            {mode === 'active' ? 'Новых обращений нет.' : 'История пока пуста.'}
          </p>
        ) : null}

        {data?.users.length ? (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              {mode === 'active' ? (
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[25%]" />
                  <col className="w-[15%]" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[27%]" />
                  <col className="w-[45%]" />
                </colgroup>
              )}
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="rounded-l-[8px] px-4 py-3 dashboard-v2-label">ФИО</th>
                  <th className="px-4 py-3 dashboard-v2-label">Email</th>
                  {mode === 'active' ? (
                    <>
                      <th className="px-4 py-3 text-center dashboard-v2-label">Заявлено</th>
                      <th className="rounded-r-[8px] px-4 py-3 text-center dashboard-v2-label">Действия</th>
                    </>
                  ) : (
                    <th className="rounded-r-[8px] px-4 py-3 dashboard-v2-label">Состояние</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-[#D7E2E7] last:border-b-0">
                    <td className="px-4 py-4 align-middle">
                      <AdminUserNameLink
                        userId={user.id}
                        fullName={user.fullName}
                        email={user.email}
                        className="dashboard-v2-text font-extrabold"
                      />
                    </td>
                    <td className="px-4 py-4 align-middle dashboard-v2-text">
                      <span className="block truncate" title={user.email}>{user.email}</span>
                    </td>
                    {mode === 'active' ? (
                      <>
                        <td className="px-4 py-4 text-center align-middle dashboard-v2-text">
                          {formatDateTime(user.externalSupervisorClaimedAt)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              disabled={updateClaim.isPending}
                              onClick={() => decide(user, 'APPROVED')}
                              className="btn flex h-[34px] w-[38px] items-center justify-center rounded-[8px] bg-[var(--color-green-brand)] text-white transition hover:brightness-95 disabled:opacity-45"
                              aria-label="Подтвердить квалификацию"
                              title="Подтвердить квалификацию"
                            >
                              <Check size={18} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={updateClaim.isPending}
                              onClick={() => decide(user, 'REJECTED')}
                              className="btn flex h-[34px] w-[38px] items-center justify-center rounded-[8px] border border-[var(--color-danger)] bg-white text-[var(--color-danger)] transition hover:bg-[var(--color-danger)] hover:text-white disabled:opacity-45"
                              aria-label="Не подтверждать квалификацию"
                              title="Не подтверждать квалификацию"
                            >
                              <X size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-4 align-middle dashboard-v2-text">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                          <span
                            className={`inline-flex min-h-[26px] shrink-0 items-center rounded-full px-3 text-[12px] font-extrabold ${
                              user.externalSupervisorClaimStatus === 'APPROVED'
                                ? 'bg-[rgba(165,203,55,0.25)] text-blue-dark'
                                : 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]'
                            }`}
                          >
                            {statusLabels[user.externalSupervisorClaimStatus]}
                          </span>
                          <span className="shrink-0 text-[#8D96B5]">
                            {formatDateTime(user.externalSupervisorClaimReviewedAt)}
                          </span>
                          {user.externalSupervisorClaimReviewedBy ? (
                            <span
                              className="min-w-0 truncate text-[#8D96B5]"
                              title={user.externalSupervisorClaimReviewedBy}
                            >
                              {user.externalSupervisorClaimReviewedBy}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="mt-5">
        <DashboardPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

export default function AdminExternalSupervisorClaimsPage() {
  return (
    <ProtectedRoute>
      <AdminExternalSupervisorClaimsPageInner />
    </ProtectedRoute>
  );
}
