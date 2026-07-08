// src/features/admin/components/UsersTable.tsx
import { useEffect, useMemo, useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { DashboardDateInput } from '@/components/DashboardDateInput';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';
import { AdminUserSearch } from './AdminUserSearch';
import { formatCertificationLevelName, systemRoleLabels } from '@/utils/labels';

type Role = 'ADMIN' | 'STUDENT' | 'REVIEWER';
type UserStatus = 'ACTIVE' | 'ARCHIVE_REQUESTED' | 'ARCHIVED' | 'ALL';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  registrationNumber?: string | null;
  role: Role;
  createdAt: string;
  lastActiveAt?: string | null;
  groups: { id: string; name: string; rank?: number | null }[];
  avatarUrl?: string | null;
  archivedAt?: string | null;
  archiveRequestedAt?: string | null;
};

const GROUP_OPTIONS = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
];

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'ARCHIVE_REQUESTED', label: 'Запрос на удаление' },
  { value: 'ARCHIVED', label: 'Архив' },
  { value: 'ALL', label: 'Все статусы' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function currentGroup(user: UserRow) {
  const group = [...(user.groups ?? [])].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0];
  return group?.name ? formatCertificationLevelName(group.name) : systemRoleLabels[user.role] || user.role;
}

function splitFullName(value?: string | null) {
  const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { lastName: '—', restName: '' };
  return {
    lastName: parts[0],
    restName: parts.slice(1).join(' '),
  };
}

function userStatus(user: UserRow) {
  if (user.archivedAt) return 'Архив';
  if (user.archiveRequestedAt) return 'Запрос на удаление';
  return 'Активен';
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(users: UserRow[]) {
  const rows = [
    ['№', 'ФИО', 'Email', 'Уровень сертификации', 'Регистрация', 'Активность', 'Статус аккаунта'],
    ...users.map((user) => [
      user.registrationNumber || '',
      user.fullName || '',
      user.email || '',
      currentGroup(user),
      formatDate(user.createdAt),
      formatDate(user.lastActiveAt),
      userStatus(user),
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users_page_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function UsersTable() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const requestPerPage = perPage === 0 ? 10000 : perPage;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      search,
      page,
      perPage: requestPerPage,
      group,
      registeredFrom,
      registeredTo,
      status,
      archived: status === 'ALL' ? 'with' as const : 'active' as const,
    }),
    [group, page, registeredFrom, registeredTo, requestPerPage, search, status],
  );

  const { data, isLoading, error, isFetching } = useUsers(params);

  const users = (data?.users as UserRow[]) ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentPerPage = data?.perPage ?? perPage;
  const totalPages = Math.max(1, Math.ceil(total / currentPerPage));

  const resetPage = (action: () => void) => {
    setPage(1);
    action();
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[110px_minmax(360px,1fr)_auto_auto]">
        <div className="dashboard-v2-caption text-[#6B7894]">
          Всего: <span className="font-extrabold text-[var(--color-blue-dark)]">{total}</span>
          {isFetching && !isLoading ? <span className="ml-2">обновляю...</span> : null}
        </div>

        <AdminUserSearch
          value={searchInput}
          onChange={setSearchInput}
          autoFocus
          size="large"
          placeholder="ФИО, email, телефон, рег. номер"
          className="mx-auto max-w-[560px]"
        />

        <button
          type="button"
          onClick={() => downloadCsv(users)}
          disabled={!users.length}
          className="btn h-[34px] whitespace-nowrap rounded-full border border-[var(--color-blue-dark)] px-4 text-[13px] font-medium text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          CSV текущей страницы
        </button>

        <PageSizeSelect
          value={perPage}
          includeAll
          onChange={(value) => resetPage(() => setPerPage(value))}
        />
      </div>

      <p className="dashboard-v2-caption hidden text-center text-[#8D96B5] sm:block">
        Быстрый переход к поиску: <span className="font-extrabold text-blue-dark">/</span> или{' '}
        <span className="font-extrabold text-blue-dark">Ctrl+K</span>.
      </p>

      <section className="card-section grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="dashboard-v2-small block">
          Регистрация с
          <DashboardDateInput
            value={registeredFrom}
            onChange={(value) => resetPage(() => setRegisteredFrom(value))}
            className="mt-1 h-[36px]"
            ariaLabel="Регистрация с"
          />
        </label>

        <label className="dashboard-v2-small block">
          Регистрация по
          <DashboardDateInput
            value={registeredTo}
            onChange={(value) => resetPage(() => setRegisteredTo(value))}
            className="mt-1 h-[36px]"
            ariaLabel="Регистрация по"
          />
        </label>

        <label className="dashboard-v2-small block">
          Уровень сертификации
          <select
            value={group}
            onChange={(event) => resetPage(() => setGroup(event.target.value))}
            className="input-design mt-1"
          >
            <option value="">Все уровни</option>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatCertificationLevelName(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-v2-small block">
          Статус аккаунта
          <select
            value={status}
            onChange={(event) => resetPage(() => setStatus(event.target.value as UserStatus))}
            className="input-design mt-1"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card-section overflow-hidden p-0">
        {isLoading && !data ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Загрузка пользователей...</p>
        ) : error ? (
          <p className="dashboard-v2-text p-6 text-[var(--color-danger)]">
            Ошибка загрузки пользователей
          </p>
        ) : users.length === 0 ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Пользователей не найдено.</p>
        ) : (
          <div className="px-0 py-4 sm:p-5">
            <p className="dashboard-v2-caption mb-3 px-3 text-[#8D96B5] sm:px-0">
              Клик по ФИО открывает детальную карточку пользователя.
            </p>

            {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
            <table className="dashboard-v2-text hidden w-full table-fixed text-[var(--color-blue-dark)] sm:table">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[31%]" />
                <col className="w-[25%]" />
                <col className="w-[17%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="rounded-l-[8px] px-3 py-3 font-medium">№</th>
                  <th className="px-3 py-3 font-medium">ФИО</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 text-center font-medium">Уровень</th>
                  <th className="px-3 py-3 text-center font-medium">Регистрация</th>
                  <th className="rounded-r-[8px] px-3 py-3 text-center font-medium">Активность</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const avatarSrc = user.avatarUrl || '/avatar_placeholder.svg';
                  const groupName = currentGroup(user);
                  const name = splitFullName(user.fullName);

                  return (
                    <tr
                      key={user.id}
                      className="group border-b border-[#DCE8EC] transition-colors hover:bg-white/70 last:border-b-0"
                    >
                      <td className="px-3 py-3">{user.registrationNumber || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-[34px] w-[34px] shrink-0 overflow-hidden rounded-full border border-[#B8C4D8] bg-[#E7E9EF]">
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src = '/avatar_placeholder.svg';
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <AdminUserNameLink
                              userId={user.id}
                              fullName={user.fullName}
                              email={user.email}
                              className="block cursor-pointer overflow-hidden break-words leading-[1.15] transition-colors group-hover:text-[var(--color-blue-darker)]"
                            >
                              <span className="block font-extrabold">{name.lastName}</span>
                              {name.restName ? <span className="block">{name.restName}</span> : null}
                            </AdminUserNameLink>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3" title={user.email}>
                        <div className="truncate">{user.email}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex min-h-[28px] w-[150px] max-w-full items-center justify-center rounded-full bg-[var(--color-blue-soft)] px-3 text-center text-[12px] font-extrabold leading-[1.15]">
                          {groupName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-[13px]">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-3 text-center text-[13px]">{formatDate(user.lastActiveAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Мобильная версия — карточки вместо таблицы */}
            <div className="space-y-3 px-3 sm:hidden">
              {users.map((user) => {
                const avatarSrc = user.avatarUrl || '/avatar_placeholder.svg';
                const groupName = currentGroup(user);
                const name = splitFullName(user.fullName);

                return (
                  <div
                    key={user.id}
                    className="rounded-[12px] border border-[#DCE8EC] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full border border-[#B8C4D8] bg-[#E7E9EF]">
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = '/avatar_placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <AdminUserNameLink
                          userId={user.id}
                          fullName={user.fullName}
                          email={user.email}
                          className="block cursor-pointer overflow-hidden font-extrabold leading-[1.15]"
                        >
                          <span className="block">{name.lastName}</span>
                          {name.restName ? <span className="block">{name.restName}</span> : null}
                        </AdminUserNameLink>
                        <div className="truncate text-[13px] text-[#6B7894]" title={user.email}>
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-[26px] max-w-full items-center justify-center rounded-full bg-[var(--color-blue-soft)] px-3 text-center text-[12px] font-extrabold leading-[1.15]">
                        {groupName}
                      </span>
                      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#EDF1F5] px-2 py-1 text-center text-[11px] font-extrabold leading-[1.15] text-[#6B7894]">
                        №{user.registrationNumber || '—'}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-[#8D96B5]">
                      <div>
                        <div>Регистрация:</div>
                        <div>{formatDate(user.createdAt)}</div>
                      </div>
                      <div>
                        <div>Активность:</div>
                        <div>{formatDate(user.lastActiveAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <DashboardPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
