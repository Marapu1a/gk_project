// src/features/registry/features/RegistryList.tsx
import { useState } from 'react';
import { useRegistry } from '../hooks/useRegistry';
import { RegistryCard } from '../components/RegistryCard';

type Props = { onOpenProfile?: (userId: string) => void; pageSize?: number };

export function RegistryList({ onOpenProfile, pageSize = 20 }: Props) {
  const [filters, setFilters] = useState({ country: '', city: '' });
  const [applied, setApplied] = useState({ country: '', city: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useRegistry({
    country: applied.country || undefined,
    city: applied.city || undefined,
    page,
    limit: pageSize,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(filters);
    setPage(1);
  };
  const onReset = () => {
    setFilters({ country: '', city: '' });
    setApplied({ country: '', city: '' });
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-blue-dark">Страна</label>
          <input
            className="input"
            value={filters.country}
            onChange={(e) => setFilters((s) => ({ ...s, country: e.target.value }))}
            placeholder="Напр. Россия"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-blue-dark">Город</label>
          <input
            className="input"
            value={filters.city}
            onChange={(e) => setFilters((s) => ({ ...s, city: e.target.value }))}
            placeholder="Напр. Москва"
          />
        </div>
        <button type="submit" className="btn btn-accent">
          Применить
        </button>
        <button type="button" onClick={onReset} className="btn">
          Сброс
        </button>
      </form>

      {/* Сетка */}
      {isLoading ? (
        <div>Загрузка…</div>
      ) : !data || data.items.length === 0 ? (
        <div>Ничего не найдено</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((u) => (
            <RegistryCard key={u.id} {...u} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}

      {/* Пагинация */}
      <div className="flex items-center justify-between">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Назад
        </button>
        <div className="text-sm text-gray-600">
          Стр. {page} из {totalPages} • Всего: {total}
        </div>
        <button
          className="btn"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}
