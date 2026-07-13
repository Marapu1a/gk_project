import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, UserCheck, Unlock } from 'lucide-react';

import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { PageNav } from '@/components/PageNav';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import {
  useExternalSupervisorClaims,
  useUpdateExternalSupervisorClaim,
  useAssignExternalSupervisorClaim,
} from '@/features/admin/hooks/useExternalSupervisorClaims';
import type { ExternalSupervisorClaimRow } from '@/features/admin/api/externalSupervisorClaims';
import { NameSortButton, nextNameSortDirection, type NameSortDirection } from '@/components/NameSortButton';
import { formatDateTimeRu as formatDateTime } from '@/utils/dateFormat';
import { StatusPill } from '@/components/StatusPill';

const statusLabels = {
  PENDING: 'Ожидает проверки',
  APPROVED: 'Квалификация подтверждена',
  SETUP_COMPLETE: 'Настройка завершена',
  REJECTED: 'Не подтверждено',
} as const;

type ActiveRowActionsProps = {
  user: ExternalSupervisorClaimRow;
  currentAdminId: string;
  onAssign: (user: ExternalSupervisorClaimRow, action: 'assign' | 'unassign') => void;
  onDecide: (user: ExternalSupervisorClaimRow, status: 'APPROVED' | 'REJECTED') => void;
  onSetupComplete: (user: ExternalSupervisorClaimRow) => void;
  isBusy: boolean;
};

function ActiveRowActions({
  user,
  currentAdminId,
  onAssign,
  onDecide,
  onSetupComplete,
  isBusy,
}: ActiveRowActionsProps) {
  const isAssignedToMe = user.externalSupervisorClaimAssignedTo === currentAdminId;
  const isAssignedToOther =
    user.externalSupervisorClaimAssignedTo !== null && !isAssignedToMe;
  const isPending = user.externalSupervisorClaimStatus === 'PENDING';
  const isApproved = user.externalSupervisorClaimStatus === 'APPROVED';

  // Not yet taken by anyone
  if (!user.externalSupervisorClaimAssignedTo) {
    return (
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onAssign(user, 'assign')}
        className="btn flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[var(--color-blue-dark)] px-3 text-[13px] font-extrabold text-white transition hover:brightness-95 disabled:opacity-45"
      >
        <UserCheck size={15} strokeWidth={2.4} />
        Взять в работу
      </button>
    );
  }

  // Taken by another admin
  if (isAssignedToOther) {
    return (
      <span className="dashboard-v2-caption text-[#8D96B5]" title={user.assignedAdmin?.email}>
        {isApproved ? 'Настраивает: ' : 'Обрабатывает: '}
        <strong className="text-blue-dark">
          {user.assignedAdmin?.fullName ?? user.assignedAdmin?.email ?? '—'}
        </strong>
      </span>
    );
  }

  // Assigned to me — PENDING stage: confirm/reject
  if (isPending && isAssignedToMe) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDecide(user, 'APPROVED')}
          className="btn flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-[var(--color-green-brand)] text-white transition hover:brightness-95 disabled:opacity-45"
          title="Подтвердить квалификацию"
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDecide(user, 'REJECTED')}
          className="btn flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[var(--color-danger)] bg-white text-[var(--color-danger)] transition hover:bg-[var(--color-danger)] hover:text-white disabled:opacity-45"
          title="Отклонить"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        <div className="mx-1 h-5 w-px bg-[#D7E2E7]" />
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAssign(user, 'unassign')}
          className="btn flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[#B8C0D1] transition hover:text-[#8D96B5] disabled:opacity-45"
          title="Освободить обращение"
        >
          <Unlock size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  // Assigned to me — APPROVED stage: setup complete
  if (isApproved && isAssignedToMe) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSetupComplete(user)}
          className="btn flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-[var(--color-green-brand)] text-white transition hover:brightness-95 disabled:opacity-45"
          title="Настройка завершена — разблокировать пользователя"
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDecide(user, 'REJECTED')}
          className="btn flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[var(--color-danger)] bg-white text-[var(--color-danger)] transition hover:bg-[var(--color-danger)] hover:text-white disabled:opacity-45"
          title="Отклонить"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return null;
}

function AdminExternalSupervisorClaimsPageInner() {
  const [mode, setMode] = useState<'active' | 'history'>('active');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [nameSort, setNameSort] = useState<NameSortDirection>(null);
  const { data, isLoading, error } = useExternalSupervisorClaims(mode, page, perPage, nameSort ?? undefined);
  const updateClaim = useUpdateExternalSupervisorClaim();
  const assignClaim = useAssignExternalSupervisorClaim();
  const { data: currentUser } = useCurrentUser();
  const { confirm } = useConfirm();

  const isBusy = updateClaim.isPending || assignClaim.isPending;

  const changeMode = (nextMode: 'active' | 'history') => {
    setMode(nextMode);
    setPage(1);
  };

  const handleAssign = async (user: ExternalSupervisorClaimRow, action: 'assign' | 'unassign') => {
    try {
      await assignClaim.mutateAsync({ userId: user.id, action });
      if (action === 'assign') toast.success('Обращение взято в работу');
      else toast.success('Обращение освобождено');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось выполнить действие');
    }
  };

  const handleDecide = async (
    user: ExternalSupervisorClaimRow,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    const approved = status === 'APPROVED';
    const ok = await confirm({
      title: approved ? 'Подтвердить квалификацию?' : 'Отклонить обращение?',
      message: approved
        ? 'Квалификация будет отмечена как подтверждённая. Настройте профиль пользователя в его карточке, затем нажмите «Настройка завершена».'
        : 'После этого пользователь снова сможет самостоятельно выбрать обычную цель сертификации.',
      confirmLabel: approved ? 'Подтвердить квалификацию' : 'Отклонить',
      variant: approved ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      await updateClaim.mutateAsync({ userId: user.id, status });
      toast.success(approved ? 'Квалификация подтверждена' : 'Обращение отклонено');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обработать обращение');
    }
  };

  const handleSetupComplete = async (user: ExternalSupervisorClaimRow) => {
    const ok = await confirm({
      title: 'Завершить настройку?',
      message:
        'Убедитесь, что профиль пользователя полностью настроен: группа, уровень и активная сертификация. После подтверждения интерфейс пользователя будет разблокирован.',
      confirmLabel: 'Да, настройка завершена',
    });
    if (!ok) return;

    try {
      await updateClaim.mutateAsync({ userId: user.id, status: 'SETUP_COMPLETE' });
      toast.success('Профиль пользователя разблокирован');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось завершить настройку');
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / perPage));

  return (
    <div className="container-fixed px-2 pb-10 pt-3 text-blue-dark md:px-6">
      <header className="mb-5">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="dashboard-v2-page-title text-center">Подтверждение квалификации</h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
          <PageNav />
          <h1 className="dashboard-v2-page-title text-center">Подтверждение квалификации</h1>
          <div />
        </div>
      </header>

      <section className="card-section px-5 py-5 shadow-soft md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-[10px] bg-[#F0F0F0] p-1">
            {([
              ['active', 'В работе'],
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
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse">
              {mode === 'active' ? (
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[26%]" />
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
                  <th className="rounded-l-[8px] px-4 py-3 dashboard-v2-label">
                    <NameSortButton
                      direction={nameSort}
                      onClick={() => {
                        setNameSort((current) => nextNameSortDirection(current));
                        setPage(1);
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 dashboard-v2-label">Email</th>
                  {mode === 'active' ? (
                    <>
                      <th className="px-4 py-3 text-center dashboard-v2-label">Заявлено</th>
                      <th className="px-4 py-3 text-center dashboard-v2-label">Этап</th>
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
                        <td className="px-4 py-4 text-center align-middle">
                          <StatusPill
                            tone={user.externalSupervisorClaimStatus === 'APPROVED' ? 'success' : 'muted'}
                            size="custom"
                            className="min-h-[24px] px-2.5 text-[11px] font-extrabold"
                          >
                            {user.externalSupervisorClaimStatus === 'APPROVED'
                              ? 'Настройка'
                              : 'Проверка'}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-center">
                            {currentUser ? (
                              <ActiveRowActions
                                user={user}
                                currentAdminId={currentUser.id}
                                onAssign={handleAssign}
                                onDecide={handleDecide}
                                onSetupComplete={handleSetupComplete}
                                isBusy={isBusy}
                              />
                            ) : null}
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-4 align-middle dashboard-v2-text">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                          <StatusPill
                            tone={user.externalSupervisorClaimStatus === 'SETUP_COMPLETE' ? 'success' : 'danger'}
                            size="md"
                            className="shrink-0"
                          >
                            {statusLabels[user.externalSupervisorClaimStatus]}
                          </StatusPill>
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
  return <AdminExternalSupervisorClaimsPageInner />;
}
