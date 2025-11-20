// src/features/registry/features/RegistryList.tsx
import { useMemo, useState } from 'react';
import { useRegistry } from '../hooks/useRegistry';
import { RegistryCard } from '../components/RegistryCard';
import { Button } from '@/components/Button';

type Props = { onOpenProfile?: (userId: string) => void; pageSize?: number };

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

// Табличный режим
function RegistryTableView({
  items,
  onOpenProfile,
}: {
  items: any[];
  onOpenProfile?: (userId: string) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
            <th className="p-3 text-left w-64">ФИО</th>
            <th className="p-3 text-left w-48">Страна / Город</th>
            <th className="p-3 text-left w-40">Квалификация</th>
            <th className="p-3 text-center w-32">Профиль</th>
          </tr>
        </thead>

        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-t" style={{ borderColor: 'var(--color-green-light)' }}>
              <td className="p-3 align-top">
                <div className="flex flex-col">
                  <span>{u.fullName}</span>
                  {u.fullNameLatin && (
                    <span className="text-xs text-gray-500">{u.fullNameLatin}</span>
                  )}
                </div>
              </td>

              <td className="p-3">{[u.country, u.city].filter(Boolean).join(', ') || '—'}</td>

              <td className="p-3">{u.groupName || '—'}</td>

              <td className="p-3 text-center">
                <button className="btn btn-brand" onClick={() => onOpenProfile?.(u.id)}>
                  Открыть
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Основной компонент
export function RegistryList({ onOpenProfile, pageSize = 20 }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const { data, isLoading } = useRegistry({
    page,
    limit: pageSize,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = data?.items ?? [];

  // Фильтр: ФИО / ФИО лат. / страна / город / квалификация (groupName)
  const filtered = useMemo(() => {
    const tokens = tokenize(searchInput);
    if (tokens.length === 0) return items;

    return items.filter((u: any) => {
      const hayParts = [u.fullName, u.fullNameLatin, u.country, u.city, u.groupName];
      const hay = norm(hayParts.filter(Boolean).join(' '));
      return tokens.every((t) => hay.includes(t));
    });
  }, [items, searchInput]);

  return (
    <div className="space-y-4">
      {/* Фильтр + тоггл вида */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex flex-col w-full sm:max-w-md">
          <label className="text-sm text-blue-dark">Фильтр</label>
          <div className="relative">
            <input
              type="text"
              className="input pr-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ФИО (рус./лат.), страна, город, квалификация…"
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-dark/60 hover:text-blue-dark"
                onClick={() => setSearchInput('')}
                title="Очистить"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost text-blue-dark underline-offset-4"
          onClick={() => setView(view === 'cards' ? 'table' : 'cards')}
        >
          {view === 'cards' ? 'Показать списком' : 'Показать плиткой'}
        </button>
      </div>

      {/* Контент */}
      {isLoading ? (
        <div>Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div>Ничего не найдено{searchInput ? ` по «${searchInput}»` : ''}</div>
      ) : view === 'table' ? (
        <RegistryTableView items={filtered} onOpenProfile={onOpenProfile} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u: any) => (
            <RegistryCard key={u.id} {...u} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}

      {/* Пагинация */}
      <div className="flex items-center justify-between">
        <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Назад
        </Button>
        <div className="text-sm text-gray-600">
          Стр. {page} из {totalPages} • Всего: {total}
        </div>
        <Button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
