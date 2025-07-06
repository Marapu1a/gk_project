import { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useToggleUserRole } from '../hooks/useToggleUserRole';
import { Link } from 'react-router-dom';

export function UsersTable() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useUsers({ search });
  const toggleRole = useToggleUserRole();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const roleMap: Record<string, string> = {
    ADMIN: 'Администратор',
    STUDENT: 'Студент',
    REVIEWER: 'Проверяющий',
  };

  if (isLoading) return <p>Загрузка пользователей...</p>;
  if (error) return <p className="text-error">Ошибка загрузки пользователей</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
        <div>
          <label className="block mb-1">Поиск</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Имя или email"
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-brand">
          Поиск
        </button>
      </form>

      <div className="overflow-x-auto border rounded-xl shadow-sm">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-blue-soft text-blue-dark">
            <tr>
              <th className="p-3 text-left w-40">Имя</th>
              <th className="p-3 text-left w-48">Email</th>
              <th className="p-3 text-left w-32">Роль</th>
              <th className="p-3 text-left w-48">Группы</th>
              <th className="p-3 text-left w-32">Создан</th>
              <th className="p-3 text-center w-48">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="p-3 truncate">{user.fullName}</td>
                <td className="p-3 truncate">{user.email}</td>
                <td className="p-3">{roleMap[user.role] || user.role}</td>
                <td className="p-3 truncate">{user.groups.map((g) => g.name).join(', ') || '—'}</td>
                <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => toggleRole.mutate(user.id)}
                    className="btn btn-approve"
                    disabled={toggleRole.isPending}
                  >
                    Роль
                  </button>
                  <Link to={`/admin/users/${user.id}`} className="btn btn-brand">
                    Детали
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
