// src/features/ceu/components/UserLookup.tsx
import { useState } from 'react';
import { useUsers } from '@/features/admin/hooks/useUsers'; // у тебя уже есть такой хук
import { Button } from '@/components/Button';

type UserLite = { id: string; fullName: string; email: string };

export function UserLookup({ onSelect }: { onSelect: (u: UserLite) => void }) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsers({ search });

  // простая дебаунс-логика по submit (по кнопке/enter)
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q.trim());
  };

  const users: UserLite[] = (data?.users ?? []).slice(0, 20); // ограничим подсказки

  return (
    <div
      className="rounded-2xl border header-shadow bg-white p-4"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <form onSubmit={submit} className="flex items-end gap-2">
        <div>
          <label className="block mb-1 text-sm text-blue-dark">Найти пользователя</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя или email"
            className="input w-72"
          />
        </div>
        <Button type="submit" variant="brand" size="sm" loading={isLoading}>
          Поиск
        </Button>
      </form>

      {users.length > 0 && (
        <div
          className="mt-3 max-h-64 overflow-auto rounded-xl border"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <ul className="divide-y" style={{ borderColor: 'var(--color-green-light)' }}>
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-3 py-2">
                <div className="truncate">
                  <div className="font-medium truncate text-blue-dark">{u.fullName || '—'}</div>
                  <div className="text-sm text-gray-500 truncate">{u.email}</div>
                </div>
                <Button size="sm" variant="accent" onClick={() => onSelect(u)}>
                  Выбрать
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {search && !isLoading && users.length === 0 && (
        <p className="text-sm text-blue-dark mt-3">Ничего не найдено по «{search}».</p>
      )}
    </div>
  );
}
