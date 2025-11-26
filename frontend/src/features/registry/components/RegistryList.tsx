// src/features/registry/features/RegistryList.tsx
import { useMemo, useState, useEffect } from 'react';
import { useRegistry } from '../hooks/useRegistry';
import type { RegistryCard as RegistryCardType } from '../api/getRegistry';
import { RegistryCard } from '../components/RegistryCard';
import { Button } from '@/components/Button';

type Props = { onOpenProfile?: (userId: string) => void; pageSize?: number };

type SortKey = 'name' | 'location' | 'group' | 'createdAt';
type SortDir = 'asc' | 'desc';

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

const isCertified = (u: RegistryCardType) => Boolean(u.isCertified);

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = iso.slice(0, 10).split('-');
  if (d.length !== 3) return iso;
  return `${d[2]}.${d[1]}.${d[0]}`;
};

const STORAGE_KEY = 'registryFiltersV1';

type PersistedState = {
  page: number;
  view: 'cards' | 'table';
  nameFilter: string;
  countryFilter: string;
  cityFilter: string;
  groupFilter: string;
  statusFilter: 'all' | 'certified';
  sortKey: SortKey;
  sortDir: SortDir;
};

function loadPersistedState(): Partial<PersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {};
  }
}

// Табличный режим
function RegistryTableView({
  items,
  onOpenProfile,
  sortKey,
  sortDir,
  onChangeSort,
}: {
  items: RegistryCardType[];
  onOpenProfile?: (userId: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onChangeSort: (key: SortKey) => void;
}) {
  const sortLabel = (key: SortKey, label: string) => {
    const active = sortKey === key;
    const arrow = !active ? '' : sortDir === 'asc' ? ' ↑' : ' ↓';
    return label + arrow;
  };

  return (
    <div
      className="overflow-x-auto rounded-2xl border"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
            <th className="p-3 text-left w-64">
              <button
                type="button"
                className="flex items-center gap-1 hover:underline"
                onClick={() => onChangeSort('name')}
              >
                {sortLabel('name', 'ФИО')}
              </button>
            </th>
            <th className="p-3 text-left w-48">
              <button
                type="button"
                className="flex items-center gap-1 hover:underline"
                onClick={() => onChangeSort('location')}
              >
                {sortLabel('location', 'Страна / Город')}
              </button>
            </th>
            <th className="p-3 text-left w-40">
              <button
                type="button"
                className="flex items-center gap-1 hover:underline"
                onClick={() => onChangeSort('group')}
              >
                {sortLabel('group', 'Квалификация')}
              </button>
            </th>
            <th className="p-3 text-left w-40">
              <button
                type="button"
                className="flex items-center gap-1 hover:underline"
                onClick={() => onChangeSort('createdAt')}
              >
                {sortLabel('createdAt', 'Дата регистрации')}
              </button>
            </th>
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

              <td className="p-3">{formatDate(u.createdAt)}</td>

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
  const persisted = loadPersistedState();

  const [page, setPage] = useState<number>(persisted.page ?? 1);
  const [view, setView] = useState<'cards' | 'table'>(persisted.view ?? 'cards');

  // фильтры
  const [nameFilter, setNameFilter] = useState(persisted.nameFilter ?? '');
  const [countryFilter, setCountryFilter] = useState(persisted.countryFilter ?? '');
  const [cityFilter, setCityFilter] = useState(persisted.cityFilter ?? '');
  const [groupFilter, setGroupFilter] = useState(persisted.groupFilter ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'certified'>(
    persisted.statusFilter ?? 'all',
  );

  // сортировка
  const [sortKey, setSortKey] = useState<SortKey>(persisted.sortKey ?? 'createdAt');
  const [sortDir, setSortDir] = useState<SortDir>(persisted.sortDir ?? 'desc');

  // Берём большую выборку и дальше всё режем на фронте.
  const { data, isLoading } = useRegistry({
    page: 1,
    limit: 1000,
  });

  const items = (data?.items ?? []) as RegistryCardType[];

  const resetFilters = () => {
    setNameFilter('');
    setCountryFilter('');
    setCityFilter('');
    setGroupFilter('');
    setStatusFilter('all');
    setSortKey('createdAt');
    setSortDir('desc');
    setPage(1);

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  // простой и явный тоггл сортировки
  const handleChangeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // 🔐 сохраняем состояние в sessionStorage при изменении
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedState = {
      page,
      view,
      nameFilter,
      countryFilter,
      cityFilter,
      groupFilter,
      statusFilter,
      sortKey,
      sortDir,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    page,
    view,
    nameFilter,
    countryFilter,
    cityFilter,
    groupFilter,
    statusFilter,
    sortKey,
    sortDir,
  ]);

  // фильтрация по полям
  const filtered = useMemo(() => {
    const nameTokens = tokenize(nameFilter);
    const countryTokens = tokenize(countryFilter);
    const cityTokens = tokenize(cityFilter);

    return items.filter((u) => {
      if (statusFilter === 'certified' && !isCertified(u)) return false;

      if (nameTokens.length > 0) {
        const hayName = norm([u.fullName, u.fullNameLatin].filter(Boolean).join(' '));
        if (!nameTokens.every((t) => hayName.includes(t))) return false;
      }

      if (countryTokens.length > 0) {
        const hayCountry = norm(u.country ?? '');
        if (!countryTokens.every((t) => hayCountry.includes(t))) return false;
      }

      if (cityTokens.length > 0) {
        const hayCity = norm(u.city ?? '');
        if (!cityTokens.every((t) => hayCity.includes(t))) return false;
      }

      if (groupFilter) {
        const hayGroup = norm(u.groupName ?? '');
        const needle = norm(groupFilter);
        if (!hayGroup.includes(needle)) return false;
      }

      return true;
    });
  }, [items, nameFilter, countryFilter, cityFilter, groupFilter, statusFilter]);

  // сортировка
  const sorted = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortKey === 'name') {
        const aName = norm(a.fullName);
        const bName = norm(b.fullName);
        if (aName < bName) return -1 * dir;
        if (aName > bName) return 1 * dir;
        return 0;
      }

      if (sortKey === 'location') {
        const aLoc = norm(`${a.country || ''} ${a.city || ''}`);
        const bLoc = norm(`${b.country || ''} ${b.city || ''}`);
        if (aLoc < bLoc) return -1 * dir;
        if (aLoc > bLoc) return 1 * dir;
        return 0;
      }

      if (sortKey === 'group') {
        const aRank = a.groupRank ?? 0;
        const bRank = b.groupRank ?? 0;
        if (aRank < bRank) return -1 * dir;
        if (aRank > bRank) return 1 * dir;
        const aName = norm(a.groupName || '');
        const bName = norm(b.groupName || '');
        if (aName < bName) return -1 * dir;
        if (aName > bName) return 1 * dir;
        return 0;
      }

      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime < bTime) return -1 * dir;
      if (aTime > bTime) return 1 * dir;
      return 0;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  // пагинация после фильтров/сортировки
  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  // если фильтрами сузили выборку и текущая страница стала "лишней" — сдвинем назад
  useEffect(() => {
    setPage((p) => {
      const clamped = Math.min(Math.max(1, totalPages), p);
      return clamped;
    });
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  return (
    <div className="space-y-4">
      {/* Фильтры + тоггл вида */}
      <div className="space-y-4">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div className="text-blue-dark text-sm font-medium">Фильтры реестра</div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost text-blue-dark/80 text-sm"
              onClick={resetFilters}
            >
              Сбросить фильтры
            </button>

            <button
              type="button"
              className="btn btn-ghost text-blue-dark underline-offset-4"
              onClick={() => setView(view === 'cards' ? 'table' : 'cards')}
            >
              {view === 'cards' ? 'Показать списком' : 'Показать плиткой'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-blue-dark">ФИО</label>
            <input
              type="text"
              className="input"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Фамилия, имя (рус./лат.)"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-blue-dark">Страна</label>
            <input
              type="text"
              className="input"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              placeholder="Например: Россия"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-blue-dark">Город</label>
            <input
              type="text"
              className="input"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Например: Москва"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-blue-dark">Квалификация (группа)</label>
            <select
              className="input"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">Все уровни</option>
              <option value="Соискатель">Соискатель</option>
              <option value="Инструктор">Инструктор</option>
              <option value="Куратор">Куратор</option>
              <option value="Супервизор">Супервизор</option>
              <option value="Опытный Супервизор">Опытный Супервизор</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-blue-dark">Статус</label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value === 'certified' ? 'certified' : 'all')
              }
            >
              <option value="all">Все соискатели</option>
              <option value="certified">Только сертифицированные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Контент */}
      {isLoading ? (
        <div>Загрузка…</div>
      ) : sorted.length === 0 ? (
        <div>Ничего не найдено</div>
      ) : view === 'table' ? (
        <RegistryTableView
          items={pageItems}
          onOpenProfile={onOpenProfile}
          sortKey={sortKey}
          sortDir={sortDir}
          onChangeSort={handleChangeSort}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((u) => (
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
          Стр. {page} из {totalPages} • Всего: {totalFiltered}
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
