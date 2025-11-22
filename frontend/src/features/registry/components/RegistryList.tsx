// src/features/registry/features/RegistryList.tsx
import { useMemo, useState } from 'react';
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

// базовая проверка полноты профиля для попадания в реестр
const isProfileComplete = (u: RegistryCardType) => {
  const hasFullName = typeof u.fullName === 'string' && u.fullName.trim().length > 0;
  const hasFullNameLatin = typeof u.fullNameLatin === 'string' && u.fullNameLatin.trim().length > 0;
  const hasCountry = typeof u.country === 'string' && u.country.trim().length > 0;
  const hasCity = typeof u.city === 'string' && u.city.trim().length > 0;
  const hasAvatar = typeof u.avatarUrl === 'string' && u.avatarUrl.trim().length > 0;
  const hasBio = typeof u.bio === 'string' && u.bio.trim().length > 0;

  return hasFullName && hasFullNameLatin && hasCountry && hasCity && hasAvatar && hasBio;
};

const isCertified = (u: RegistryCardType) => Boolean(u.isCertified);

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = iso.slice(0, 10).split('-');
  if (d.length !== 3) return iso;
  return `${d[2]}.${d[1]}.${d[0]}`;
};

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
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  // фильтры
  const [nameFilter, setNameFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'certified'>('all');

  // сортировка
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading } = useRegistry({
    page,
    limit: pageSize,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = (data?.items ?? []) as RegistryCardType[];

  const resetFilters = () => {
    setNameFilter('');
    setCountryFilter('');
    setCityFilter('');
    setGroupFilter('');
    setStatusFilter('all');
    setPage(1);
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

  // сначала выкидываем неполные профили
  const eligibleItems = useMemo(() => items.filter((u) => isProfileComplete(u)), [items]);

  // фильтрация по полям
  const filtered = useMemo(() => {
    const nameTokens = tokenize(nameFilter);
    const countryTokens = tokenize(countryFilter);
    const cityTokens = tokenize(cityFilter);
    const groupTokens = tokenize(groupFilter);

    return eligibleItems.filter((u) => {
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

      if (groupTokens.length > 0) {
        const hayGroup = norm(u.groupName ?? '');
        if (!groupTokens.every((t) => hayGroup.includes(t))) return false;
      }

      return true;
    });
  }, [eligibleItems, nameFilter, countryFilter, cityFilter, groupFilter, statusFilter]);

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
            <input
              type="text"
              className="input"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              placeholder="Инструктор, Куратор…"
            />
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
          items={sorted}
          onOpenProfile={onOpenProfile}
          sortKey={sortKey}
          sortDir={sortDir}
          onChangeSort={handleChangeSort}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((u) => (
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
