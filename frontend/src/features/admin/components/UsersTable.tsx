// src/features/admin/components/UsersTable.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';
import { useDeleteUser } from '@/features/user/hooks/useDeleteUser';
import { Button } from '@/components/Button';
import { toast } from 'sonner';

type Role = 'ADMIN' | 'STUDENT' | 'REVIEWER';
type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  groups: { id: string; name: string }[];
};

const roleMap: Record<Role, string> = {
  ADMIN: 'Администратор',
  STUDENT: 'Студент',
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

  const { data, isLoading, error } = useUsers({ search, page, perPage });
  const deleteUser = useDeleteUser();

  // локальные копии для оптимистичного удаления
  const [localUsers, setLocalUsers] = useState<UserRow[]>([]);
  const [localTotal, setLocalTotal] = useState(0);

  useEffect(() => {
    setLocalUsers(data?.users ?? []);
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
        roleMap[u.role] || u.role, // русская роль
        u.role, // и enum на всякий
        ...u.groups.map((g) => g.name),
      ];
      const hay = norm(hayParts.filter(Boolean).join(' '));
      // каждый токен должен встретиться
      return tokens.every((t) => hay.includes(t));
    });
  }, [localUsers, searchInput]);

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const onDelete = async (u: UserRow) => {
    const ok = await confirmToast(
      `Удалить пользователя ${u.email} безвозвратно (включая файлы и все данные)?`,
    );
    if (!ok) return;

    // оптимистично скрываем строку сразу
    setPendingId(u.id);
    const prevUsers = localUsers;
    const prevTotal = localTotal;
    setLocalUsers((list) => list.filter((x) => x.id !== u.id));
    setLocalTotal((t) => Math.max(0, t - 1));

    try {
      await deleteUser.mutateAsync(u.id);
      toast.success('Пользователь удалён');
      if (prevUsers.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (e: any) {
      setLocalUsers(prevUsers);
      setLocalTotal(prevTotal);
      toast.error(e?.response?.data?.error || 'Не удалось удалить пользователя');
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
          <div className="relative">
            <label className="block mb-1 text-sm text-blue-dark">Фильтр</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ФИО, email, группа, роль (Студент/проверяющий/админ)"
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
                    <th className="p-3 text-left w-12">№</th>
                    <th className="p-3 text-left w-64">ФИО</th>
                    <th className="p-3 text-left w-56">Email</th>
                    <th className="p-3 text-left w-32">Роль</th>
                    <th className="p-3 text-left w-56">Группы</th>
                    <th className="p-3 text-left w-32">Создан</th>
                    <th className="p-3 text-center w-40">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isRowPending = pendingId === u.id;
                    const number = (currentPage - 1) * currentPerPage + idx + 1;

                    return (
                      <tr
                        key={u.id}
                        className="border-t align-top"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <td className="p-4 text-center">{number}</td>

                        <td className="p-4">
                          <div className="whitespace-normal break-words" title={u.fullName}>
                            {u.fullName || '—'}
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
                            className="whitespace-normal break-words"
                            title={u.groups.map((g) => g.name).join(', ')}
                          >
                            {u.groups.map((g) => g.name).join(', ') || '—'}
                          </div>
                        </td>

                        <td className="p-4">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link to={`/admin/users/${u.id}`} className="btn btn-brand">
                              Детали
                            </Link>
                            <button
                              onClick={() => onDelete(u)}
                              className="btn btn-danger"
                              disabled={isRowPending}
                              title="Удалить пользователя"
                            >
                              {isRowPending ? 'Удаляю…' : 'Удалить'}
                            </button>
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
