import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';
import { useToggleUserRole } from '../hooks/useToggleUserRole';
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

export function UsersTable() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, error } = useUsers({ search });
  const toggleRole = useToggleUserRole();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const onToggle = async (u: UserRow) => {
    const toAdmin = u.role !== 'ADMIN';
    const ok = await confirmToast(
      toAdmin ? `Сделать ${u.email} администратором?` : `Снять администратора с ${u.email}?`,
    );
    if (!ok) return;

    try {
      setPendingId(u.id);
      await toggleRole.mutateAsync(u.id);
      toast.success(toAdmin ? 'Права администратора выданы' : 'Права администратора сняты');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обновить роль');
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) return <p className="text-sm text-blue-dark p-4">Загрузка пользователей…</p>;
  if (error) return <p className="text-error p-4">Ошибка загрузки пользователей</p>;

  const users: UserRow[] = data?.users ?? [];

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
        <h2 className="text-xl font-semibold text-blue-dark">Пользователи</h2>

        <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">Поиск</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Имя или email"
              className="input w-64"
            />
          </div>
          <button type="submit" className="btn btn-brand">
            Поиск
          </button>
        </form>
      </div>

      {/* Body */}
      <div className="p-6">
        {users.length === 0 ? (
          <p className="text-sm text-blue-dark">
            Ничего не найдено{search ? ` по «${search}»` : ''}.
          </p>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                  <th className="p-3 text-left w-40">Имя</th>
                  <th className="p-3 text-left w-48">Email</th>
                  <th className="p-3 text-left w-32">Роль</th>
                  <th className="p-3 text-left w-48">Группы</th>
                  <th className="p-3 text-left w-32">Создан</th>
                  <th className="p-3 text-center w-56">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isAdmin = u.role === 'ADMIN';
                  const isRowPending = pendingId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-t"
                      style={{ borderColor: 'var(--color-green-light)' }}
                    >
                      <td className="p-3 truncate">{u.fullName || '—'}</td>
                      <td className="p-3 truncate">{u.email}</td>
                      <td className="p-3">
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
                      <td className="p-3 truncate">
                        {u.groups.map((g) => g.name).join(', ') || '—'}
                      </td>
                      <td className="p-3">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onToggle(u)}
                            className="btn btn-accent"
                            disabled={isRowPending}
                            title={isAdmin ? 'Снять администратора' : 'Сделать админом'}
                          >
                            {isRowPending
                              ? 'Сохраняю…'
                              : isAdmin
                                ? 'Снять администратора'
                                : 'Сделать админом'}
                          </button>

                          <Link to={`/admin/users/${u.id}`} className="btn btn-brand">
                            Детали
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
