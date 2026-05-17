// src/features/admin/components/UsersTable.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';
import { useArchiveUser, useRestoreUser } from '../hooks/useArchiveUser';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

type Role = 'ADMIN' | 'STUDENT' | 'REVIEWER';
type UserRow = {
  id: string;
  fullName: string;
  email: string;
  registrationNumber?: string | null;
  phone?: string | null;
  role: Role;
  createdAt: string;
  lastActiveAt?: string | null;
  groups: { id: string; name: string }[];
  avatarUrl?: string | null; // 👈 аватар
  archivedAt?: string | null;
  archiveRequestedAt?: string | null;
  archiveRequestReason?: string | null;
};

const roleMap: Record<Role, string> = {
  ADMIN: 'Администратор',
  STUDENT: 'Соискатель',
  REVIEWER: 'Проверяющий',
};

// нормализуем под сравнение
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

export function UsersTable() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState(''); // уходит на сервер (debounced)
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [archiveMode, setArchiveMode] = useState<'active' | 'only'>('active');

  // серверная пагинация
  const [page, setPage] = useState(1);
  const perPage = 20;

  // дергаем сервер с дебаунсом
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, error } = useUsers({ search, page, perPage, archived: archiveMode });
  const archiveUser = useArchiveUser();
  const restoreUser = useRestoreUser();
  const { confirm } = useConfirm();

  // локальные копии для оптимистичного удаления
  const [localUsers, setLocalUsers] = useState<UserRow[]>([]);
  const [localTotal, setLocalTotal] = useState(0);

  useEffect(() => {
    setLocalUsers((data?.users as UserRow[]) ?? []);
    setLocalTotal(data?.total ?? 0);
  }, [data]);

  // ⚡ Мгновенный фильтр на клиенте: токены + AND
  const clientFilteredUsers = useMemo(() => {
    const tokens = tokenize(searchInput);
    if (tokens.length === 0) return localUsers;

    return localUsers.filter((u) => {
      // собираем “сено” для поиска
      const hayParts = [
        u.fullName,
        u.email,
        u.phone ?? '',
        u.registrationNumber ?? '',
        roleMap[u.role] || u.role, // русская роль
        u.role, // и enum на всякий
        ...u.groups.map((g) => g.name),
      ];
      const hay = norm(hayParts.filter(Boolean).join(' '));
      // каждый токен должен встретиться
      return tokens.every((t) => hay.includes(t));
    });
  }, [localUsers, searchInput]);

  const onArchive = async (u: UserRow) => {
    const ok = await confirm({
      message: `Архивировать пользователя ${u.email}?`,
      description: 'Он не сможет войти и исчезнет из рабочих списков.',
      confirmLabel: 'Архивировать',
      variant: 'danger',
    });
    if (!ok) return;

    setPendingId(u.id);
    const prevUsers = localUsers;
    const prevTotal = localTotal;
    setLocalUsers((list) => list.filter((x) => x.id !== u.id));
    setLocalTotal((t) => Math.max(0, t - 1));

    try {
      await archiveUser.mutateAsync({ userId: u.id });
      toast.success('Пользователь отправлен в архив');
      if (prevUsers.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (e: any) {
      setLocalUsers(prevUsers);
      setLocalTotal(prevTotal);
      toast.error(e?.response?.data?.error || 'Не удалось архивировать пользователя');
    } finally {
      setPendingId(null);
    }
  };

  const onRestore = async (u: UserRow) => {
    const ok = await confirm({
      message: `Восстановить пользователя ${u.email} из архива?`,
      confirmLabel: 'Восстановить',
    });
    if (!ok) return;

    setPendingId(u.id);
    const prevUsers = localUsers;
    const prevTotal = localTotal;
    setLocalUsers((list) => list.filter((x) => x.id !== u.id));
    setLocalTotal((t) => Math.max(0, t - 1));

    try {
      await restoreUser.mutateAsync(u.id);
      toast.success('Пользователь восстановлен');
      if (prevUsers.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (e: any) {
      setLocalUsers(prevUsers);
      setLocalTotal(prevTotal);
      toast.error(e?.response?.data?.error || 'Не удалось восстановить пользователя');
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading && !data)
    return <p className="text-sm text-blue-dark p-4">Загрузка пользователей…</p>;
  if (error) return <p className="text-error p-4">Ошибка загрузки пользователей</p>;

  const users: UserRow[] = clientFilteredUsers; // показываем мгновенно отфильтрованное
  const total = localTotal; // общее с сервера (по server-side фильтру)
  const shown = users.length; // показано на странице после клиентского фильтра
  const currentPage = data?.page ?? page;
  const currentPerPage = data?.perPage ?? perPage;
  const totalPages = Math.max(1, Math.ceil(total / currentPerPage));

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">
          Пользователи ({shown}/{total})
        </h2>

        {/* Живой фильтр */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            className={`btn h-[38px] rounded-full px-4 text-sm ${
              archiveMode === 'only' ? 'btn-dark' : 'border border-blue-dark text-blue-dark'
            }`}
            onClick={() => {
              setPage(1);
              setArchiveMode((mode) => (mode === 'only' ? 'active' : 'only'));
            }}
          >
            {archiveMode === 'only' ? 'Активные' : 'Архив'}
          </button>
          <div className="relative">
            <label className="block mb-1 text-sm text-blue-dark">Фильтр</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ФИО, email, телефон, номер, группа, роль"
              className="input w-80 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2 bottom-2 text-blue-dark/60 hover:text-blue-dark"
                onClick={() => setSearchInput('')}
                title="Очистить"
              >
                ×
              </button>
            )}
          </div>
          {isLoading && <span className="text-xs text-blue-dark">обновляю…</span>}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {users.length === 0 ? (
          <p className="text-sm text-blue-dark">
            Ничего не найдено{searchInput ? ` по «${searchInput}»` : ''}.
          </p>
        ) : (
          <>
            <div
              className="overflow-x-auto rounded-2xl border"
              style={{ borderColor: 'var(--color-green-light)' }}
            >
              <table className="w-full text-sm table-auto">
                <thead>
                  <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                    <th className="p-3 text-left w-24">N</th>
                    <th className="p-3 text-left w-64">ФИО</th>
                    <th className="p-3 text-left w-56">Email</th>
                    <th className="p-3 text-left w-32">Роль</th>
                    <th className="p-3 text-left w-56">Группы</th>
                    <th className="p-3 text-left w-32">Создан</th>
                    <th className="p-3 text-left w-36">Активность</th>
                    <th className="p-3 text-left w-40">Архив</th>
                    <th className="p-3 text-center w-40">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isRowPending = pendingId === u.id;
                    const avatarSrc = u.avatarUrl || '/avatar_placeholder.svg';

                    return (
                      <tr
                        key={u.id}
                        className="border-t align-top"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <td className="p-4 font-semibold text-blue-dark">
                          {u.registrationNumber || '—'}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full overflow-hidden shrink-0 border"
                              style={{
                                borderColor: 'var(--color-green-light)',
                                background: 'var(--color-blue-soft)',
                              }}
                            >
                              <img
                                src={avatarSrc}
                                alt={u.fullName || 'Аватар'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="whitespace-normal wrap-break-word" title={u.fullName}>
                              {u.fullName || '—'}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 truncate" title={u.email}>
                          {u.email}
                        </td>

                        <td className="p-4">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs"
                            style={{
                              color: 'var(--color-white)',
                              background: isAdmin
                                ? 'var(--color-green-brand)'
                                : 'var(--color-blue-dark)',
                            }}
                          >
                            {roleMap[u.role] || u.role}
                          </span>
                        </td>

                        <td className="p-4">
                          <div
                            className="whitespace-normal wrap-break-word"
                            title={u.groups.map((g) => g.name).join(', ')}
                          >
                            {u.groups.map((g) => g.name).join(', ') || '—'}
                          </div>
                        </td>

                        <td className="p-4">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}
                        </td>

                        <td className="p-4">
                          {u.lastActiveAt
                            ? new Date(u.lastActiveAt).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>

                        <td className="p-4 text-xs">
                          {u.archivedAt ? (
                            <span className="text-[#8D96B5]">
                              Архив: {new Date(u.archivedAt).toLocaleDateString('ru-RU')}
                            </span>
                          ) : u.archiveRequestedAt ? (
                            <span
                              className="rounded-full bg-[rgba(255,83,100,0.18)] px-2 py-1 text-[var(--color-danger)]"
                              title={u.archiveRequestReason || undefined}
                            >
                              Запрос на удаление
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Link to={`/admin/users/${u.id}`} className="btn btn-brand">
                              Детали
                            </Link>
                            {archiveMode === 'only' ? (
                              <button
                                onClick={() => onRestore(u)}
                                className="btn btn-dark rounded-full px-4 py-2 text-xs"
                                disabled={isRowPending}
                                title="Восстановить пользователя"
                              >
                                {isRowPending ? '...' : 'Вернуть'}
                              </button>
                            ) : (
                              <button
                                onClick={() => onArchive(u)}
                                className="btn btn-ghost rounded-full border border-blue-dark px-4 py-2 text-xs"
                                disabled={isRowPending}
                                title="Архивировать пользователя"
                              >
                                {isRowPending ? '...' : 'Архив'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                <Button
                  variant="accent"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </Button>
                <span className="px-2 text-sm text-blue-dark">
                  Стр. {currentPage} из {totalPages}
                </span>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Вперёд
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
