// src/features/admin/components/UsersTable.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { DashboardPagination, PageSizeSelect } from '@/components/DashboardPagination';

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

const roleMap: Record<Role, string> = {
  ADMIN: 'Администратор',
  STUDENT: 'Соискатель',
  REVIEWER: 'Проверяющий',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

function currentGroup(user: UserRow) {
  const group = [...(user.groups ?? [])].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0];
  return group?.name || roleMap[user.role] || user.role;
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
    ['№', 'ФИО', 'Email', 'Роль', 'Регистрация', 'Активность', 'Статус'],
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
      perPage,
      group,
      registeredFrom,
      registeredTo,
      status,
      archived: status === 'ALL' ? 'with' as const : 'active' as const,
    }),
    [group, page, perPage, registeredFrom, registeredTo, search, status],
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="dashboard-v2-caption text-[#6B7894]">
          Всего: <span className="font-extrabold text-[var(--color-blue-dark)]">{total}</span>
          {isFetching && !isLoading ? <span className="ml-2">обновляю...</span> : null}
        </div>

        <label className="relative block w-full max-w-[360px]">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ФИО, Name, Email"
            className="input-design h-[34px] rounded-full pl-4 pr-10"
          />
          <Search
            size={17}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8D96B5]"
          />
        </label>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => downloadCsv(users)}
            disabled={!users.length}
            className="btn h-[34px] rounded-full border border-[var(--color-blue-dark)] px-4 text-[13px] font-medium text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            CSV текущей страницы
          </button>
          <PageSizeSelect value={perPage} onChange={(value) => resetPage(() => setPerPage(value))} />
        </div>
      </div>

      <section className="card-section grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="dashboard-v2-small block">
          Регистрация с
          <input
            type="date"
            value={registeredFrom}
            onChange={(event) => resetPage(() => setRegisteredFrom(event.target.value))}
            className="input-design mt-1"
          />
        </label>

        <label className="dashboard-v2-small block">
          Регистрация по
          <input
            type="date"
            value={registeredTo}
            onChange={(event) => resetPage(() => setRegisteredTo(event.target.value))}
            className="input-design mt-1"
          />
        </label>

        <label className="dashboard-v2-small block">
          Роль
          <select
            value={group}
            onChange={(event) => resetPage(() => setGroup(event.target.value))}
            className="input-design mt-1"
          >
            <option value="">Все роли</option>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-v2-small block">
          Статус
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
          <div className="p-5">
            <p className="dashboard-v2-caption mb-3 text-[#8D96B5]">
              Клик по ФИО открывает детальную карточку пользователя.
            </p>
            <table className="dashboard-v2-text w-full table-fixed text-[var(--color-blue-dark)]">
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
                  <th className="px-3 py-3 text-center font-medium">Роль</th>
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
                    <tr key={user.id} className="border-b border-[#DCE8EC] last:border-b-0">
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
                            <Link
                              to={`/admin/users/${user.id}`}
                              className="block overflow-hidden break-words leading-[1.15] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
                              title={user.fullName || ''}
                            >
                              <span className="block font-extrabold">{name.lastName}</span>
                              {name.restName ? <span className="block">{name.restName}</span> : null}
                            </Link>
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
          </div>
        )}
      </section>

      <DashboardPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
