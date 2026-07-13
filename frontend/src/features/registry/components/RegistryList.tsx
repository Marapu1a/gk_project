import { useEffect, useMemo, useState } from 'react';
import { Grid2X2, List, Mail, Search, X } from 'lucide-react';
import { useRegistry } from '../hooks/useRegistry';
import type { RegistryCard as RegistryCardType } from '../api/getRegistry';
import { RegistryCard } from '../components/RegistryCard';
import { SpecialistContactModal } from './SpecialistContactModal';
import { DashboardPagination } from '@/components/DashboardPagination';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { smartDefaultSort } from '@/utils/sortRegistry';

type Props = { onOpenProfile?: (userId: string) => void; pageSize?: number };
type RegistryTab = 'specialists' | 'applicants';
type RegistryView = 'cards' | 'table';

const STORAGE_KEY = 'registryFiltersV2';

const GROUP_OPTIONS = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
  'Опытный супервизор',
];

type PersistedState = {
  page: number;
  tab: RegistryTab;
  view: RegistryView;
  nameFilter: string;
  countryFilter: string;
  cityFilter: string;
  groupFilter: string;
};

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

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

function isRegistryTabItem(user: RegistryCardType, tab: RegistryTab) {
  if (tab === 'specialists') return user.isCertified;
  return !user.isCertified && user.hasActiveCycle;
}

function resetPageAnd<T>(setter: (value: T) => void, value: T, resetPage: () => void) {
  setter(value);
  resetPage();
}

function RegistryTableView({
  items,
  variant,
  onOpenProfile,
  onContact,
}: {
  items: RegistryCardType[];
  variant: RegistryTab;
  onOpenProfile?: (userId: string) => void;
  onContact?: (user: { id: string; fullName: string }) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-white px-4 py-3 shadow-soft">
      <div className="divide-y divide-[var(--color-blue-soft)]">
        {items.map((user) => (
          <RegistryListRow
            key={user.id}
            user={user}
            variant={variant}
            onOpenProfile={onOpenProfile}
            onContact={onContact}
          />
        ))}
      </div>
    </div>
  );
}

function RegistryListRow({
  user,
  variant,
  onOpenProfile,
  onContact,
}: {
  user: RegistryCardType;
  variant: RegistryTab;
  onOpenProfile?: (userId: string) => void;
  onContact?: (user: { id: string; fullName: string }) => void;
}) {
  const placeholder = '/avatar_placeholder.svg';
  const clickable = Boolean(onOpenProfile);
  const isApplicant = variant === 'applicants';

  const avatar = (
    <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#B8C1D6] bg-[#E7EAF0]">
      <img
        src={user.avatarUrl || placeholder}
        alt={user.fullName}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src.endsWith('avatar_placeholder.svg')) return;
          el.src = placeholder;
        }}
      />
    </div>
  );

  const actionButton = isApplicant ? (
    <ActionArrowButton
      size={28}
      aria-label="Открыть профиль"
      onClick={(e) => {
        e.stopPropagation();
        onOpenProfile?.(user.id);
      }}
    />
  ) : (
    <button
      type="button"
      className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-green-brand)] hover:text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:bg-[#D1D7E3] disabled:text-white"
      aria-label="Написать пользователю"
      disabled={!user.isCertified}
      onClick={(e) => {
        e.stopPropagation();
        if (!user.isCertified) return;
        onContact?.({ id: user.id, fullName: user.fullName });
      }}
    >
      <Mail size={18} strokeWidth={2.4} />
    </button>
  );

  const rowProps = {
    onClick: () => onOpenProfile?.(user.id),
    role: clickable ? ('button' as const) : undefined,
    tabIndex: clickable ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!clickable) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenProfile?.(user.id);
      }
    },
  };

  return (
    <>
      {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
      <div
        className={[
          'hidden sm:grid',
          isApplicant
            ? 'min-h-[52px] grid-cols-[38px_minmax(170px,1.25fr)_minmax(110px,0.8fr)_minmax(120px,0.9fr)_32px] items-center gap-4 px-2 py-2 text-[13px] text-[var(--color-blue-dark)] transition'
            : 'min-h-[52px] grid-cols-[38px_minmax(170px,1.25fr)_minmax(90px,0.7fr)_minmax(110px,0.8fr)_minmax(150px,0.9fr)_30px] items-center gap-4 px-2 py-2 text-[13px] text-[var(--color-blue-dark)] transition',
          clickable ? 'cursor-pointer hover:bg-[var(--color-blue-soft)]' : '',
        ].join(' ')}
        {...rowProps}
      >
        {avatar}

        <div className="min-w-0">
          <p className="line-clamp-2 text-[14px] font-extrabold leading-[1.1] text-[#222]">{user.fullName}</p>
        </div>

        <p className="truncate font-semibold text-[#8D96B5]">{user.country || '—'}</p>
        <p className="truncate font-semibold text-[#8D96B5]">{user.city || '—'}</p>

        {!isApplicant && (
          <span className="inline-flex min-h-[24px] max-w-full items-center justify-center rounded-full bg-[var(--color-blue-soft)] px-3 text-[12px] font-extrabold leading-[1.1]">
            <span className="truncate">{user.groupName || '—'}</span>
          </span>
        )}

        {actionButton}
      </div>

      {/* Мобильная версия — карточка вместо фиксированной сетки */}
      <div
        className={`flex items-center gap-3 px-2 py-2 text-[13px] text-[var(--color-blue-dark)] transition sm:hidden ${
          clickable ? 'cursor-pointer hover:bg-[var(--color-blue-soft)]' : ''
        }`}
        {...rowProps}
      >
        {avatar}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-extrabold leading-[1.1] text-[#222]">{user.fullName}</p>
          <p className="truncate text-[12px] font-semibold text-[#8D96B5]">
            {[user.country, user.city].filter(Boolean).join(', ') || '—'}
          </p>
          {!isApplicant && (
            <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-[var(--color-blue-soft)] px-2 py-0.5 text-[11px] font-extrabold leading-[1.1]">
              <span className="truncate">{user.groupName || '—'}</span>
            </span>
          )}
        </div>

        {actionButton}
      </div>
    </>
  );
}

export function RegistryList({ onOpenProfile, pageSize = 18 }: Props) {
  const persisted = loadPersistedState();

  const [page, setPage] = useState(persisted.page ?? 1);
  const [tab, setTab] = useState<RegistryTab>(persisted.tab ?? 'specialists');
  const [view, setView] = useState<RegistryView>(persisted.view ?? 'cards');
  const [nameFilter, setNameFilter] = useState(persisted.nameFilter ?? '');
  const [countryFilter, setCountryFilter] = useState(persisted.countryFilter ?? '');
  const [cityFilter, setCityFilter] = useState(persisted.cityFilter ?? '');
  const [groupFilter, setGroupFilter] = useState(persisted.groupFilter ?? '');
  const [contactTarget, setContactTarget] = useState<{ id: string; fullName: string } | null>(null);

  const resetPage = () => setPage(1);
  const isApplicantsTab = tab === 'applicants';

  const { data, isLoading } = useRegistry({ page: 1, limit: 1000 });
  const items = useMemo(() => (data?.items ?? []) as RegistryCardType[], [data?.items]);

  const tabItems = useMemo(() => items.filter((user) => isRegistryTabItem(user, tab)), [items, tab]);
  const groups = useMemo(() => {
    const known = new Set(GROUP_OPTIONS.map(norm));
    const fromData = tabItems
      .map((user) => user.groupName?.trim())
      .filter((value): value is string => Boolean(value));
    return [
      ...GROUP_OPTIONS,
      ...fromData.filter((value) => !known.has(norm(value))),
    ].filter((value, index, arr) => arr.findIndex((item) => norm(item) === norm(value)) === index);
  }, [tabItems]);

  const filtered = useMemo(() => {
    const nameTokens = tokenize(nameFilter);
    const countryTokens = tokenize(countryFilter);
    const cityTokens = tokenize(cityFilter);

    return tabItems.filter((user) => {
      if (nameTokens.length > 0) {
        const hayName = norm([user.fullName, user.fullNameLatin].filter(Boolean).join(' '));
        if (!nameTokens.every((token) => hayName.includes(token))) return false;
      }

      if (countryTokens.length > 0) {
        const hayCountry = norm(user.country ?? '');
        if (!countryTokens.every((token) => hayCountry.includes(token))) return false;
      }

      if (cityTokens.length > 0) {
        const hayCity = norm(user.city ?? '');
        if (!cityTokens.every((token) => hayCity.includes(token))) return false;
      }

      if (!isApplicantsTab && groupFilter && norm(user.groupName ?? '') !== norm(groupFilter)) {
        return false;
      }

      return true;
    });
  }, [tabItems, nameFilter, countryFilter, cityFilter, groupFilter, isApplicantsTab]);

  const sorted = useMemo(() => smartDefaultSort(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedState = {
      page,
      tab,
      view,
      nameFilter,
      countryFilter,
      cityFilter,
      groupFilter,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [cityFilter, countryFilter, groupFilter, nameFilter, page, tab, view]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [page, pageSize, sorted]);

  const resetFilters = () => {
    setNameFilter('');
    setCountryFilter('');
    setCityFilter('');
    setGroupFilter('');
    setPage(1);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleTabChange = (nextTab: RegistryTab) => {
    setTab(nextTab);
    setGroupFilter('');
    setPage(1);
  };

  return (
    <section className="space-y-5">
      <div>
        {/* Мобильная версия — вкладки стопкой, активная спереди, вторая выглядывает сзади */}
        <div className="flex items-end justify-between gap-3 px-4 sm:hidden">
          <div className="relative h-[42px] flex-1">
            <button
              type="button"
              onClick={() => handleTabChange(tab === 'specialists' ? 'applicants' : 'specialists')}
              aria-label={`Показать: ${tab === 'specialists' ? 'Соискатели' : 'Специалисты'}`}
              className={`absolute right-0 top-1 z-0 h-[38px] w-[calc(100%-40px)] cursor-pointer rounded-t-[14px] px-4 text-left text-[15px] font-bold transition ${
                tab === 'specialists'
                  ? 'bg-[#D3DAF0] text-[var(--color-blue-dark)] hover:bg-[#C3CCE8]'
                  : 'bg-[var(--color-green-light)] text-[var(--color-green-darker)] hover:bg-[#CCE87A]'
              }`}
            >
              {tab === 'specialists' ? 'Соискатели' : 'Специалисты'}
            </button>

            <button
              key={tab}
              type="button"
              className={`animate-tab-pop-in absolute left-0 top-0 z-10 h-[42px] w-[calc(100%-40px)] cursor-default rounded-t-[16px] px-4 text-left text-[16px] font-black shadow-[0_-2px_8px_rgba(0,0,0,0.08)] ${
                tab === 'specialists'
                  ? 'bg-[var(--color-green-brand)] text-[var(--color-blue-dark)]'
                  : 'bg-[var(--color-blue-dark)] text-white'
              }`}
            >
              {tab === 'specialists' ? 'Специалисты' : 'Соискатели'}
            </button>
          </div>

          <button
            type="button"
            className="mb-1.5 flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#8D96B5] bg-white text-[var(--color-blue-dark)] transition hover:bg-[var(--color-blue-soft)]"
            onClick={() => setView((current) => (current === 'cards' ? 'table' : 'cards'))}
            aria-label={view === 'cards' ? 'Показать списком' : 'Показать карточками'}
            title={view === 'cards' ? 'Показать списком' : 'Показать карточками'}
          >
            {view === 'cards' ? <List size={20} /> : <Grid2X2 size={18} />}
          </button>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] items-end gap-2 px-8 sm:grid md:px-14">
          <button
            type="button"
            className={`min-h-[42px] cursor-pointer rounded-t-[16px] px-5 text-[17px] font-black transition ${
              tab === 'specialists'
                ? 'bg-[var(--color-green-brand)] text-[var(--color-blue-dark)]'
                : 'bg-[#DDE2EA] text-[#8D96B5] hover:bg-[var(--color-blue-soft)]'
            }`}
            onClick={() => handleTabChange('specialists')}
          >
            Специалисты
          </button>
          <button
            type="button"
            className={`min-h-[42px] cursor-pointer rounded-t-[16px] px-5 text-[17px] font-black transition ${
              tab === 'applicants'
                ? 'bg-[var(--color-green-brand)] text-[var(--color-blue-dark)]'
                : 'bg-[#DDE2EA] text-[#8D96B5] hover:bg-[var(--color-blue-soft)]'
            }`}
            onClick={() => handleTabChange('applicants')}
          >
            Соискатели
          </button>
          <button
            type="button"
            className="mb-1.5 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-[#8D96B5] bg-white text-[var(--color-blue-dark)] transition hover:bg-[var(--color-blue-soft)]"
            onClick={() => setView((current) => (current === 'cards' ? 'table' : 'cards'))}
            aria-label={view === 'cards' ? 'Показать списком' : 'Показать карточками'}
            title={view === 'cards' ? 'Показать списком' : 'Показать карточками'}
          >
            {view === 'cards' ? <List size={20} /> : <Grid2X2 size={18} />}
          </button>
        </div>

        <div className="relative z-10 -mt-1 rounded-[18px] bg-white px-5 py-4 shadow-soft">
          <div
            className={`grid grid-cols-1 gap-4 md:items-end ${
              isApplicantsTab
                ? 'md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)_minmax(0,1fr)_34px]'
                : 'md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_34px]'
            }`}
          >
            <label className="block">
              <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Пользователь</span>
              <div className="relative mt-1">
                <input
                  type="text"
                  className="input-design h-[32px] pr-9"
                  value={nameFilter}
                  onChange={(e) => resetPageAnd(setNameFilter, e.target.value, resetPage)}
                  placeholder="ФИО или Name"
                />
                <Search
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D96B5]"
                />
              </div>
            </label>

            <label className="block">
              <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Страна</span>
              <input
                type="text"
                className="input-design mt-1 h-[32px]"
                value={countryFilter}
                onChange={(e) => resetPageAnd(setCountryFilter, e.target.value, resetPage)}
                placeholder="Например, Россия"
              />
            </label>

            <label className="block">
              <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Город</span>
              <input
                type="text"
                className="input-design mt-1 h-[32px]"
                value={cityFilter}
                onChange={(e) => resetPageAnd(setCityFilter, e.target.value, resetPage)}
                placeholder="Например, Москва"
              />
            </label>

            {!isApplicantsTab && (
              <label className="block">
                <span className="dashboard-v2-label text-[var(--color-blue-dark)]">Квалификация</span>
                <select
                  className="input-design mt-1 h-[32px]"
                  value={groupFilter}
                  onChange={(e) => resetPageAnd(setGroupFilter, e.target.value, resetPage)}
                >
                  <option value="">Все уровни</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full text-[#8D96B5] transition hover:bg-[var(--color-blue-soft)] hover:text-[var(--color-blue-dark)]"
              onClick={resetFilters}
              aria-label="Сбросить фильтры"
              title="Сбросить фильтры"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[18px] bg-white px-5 py-8 text-center text-[#8D96B5] shadow-soft">
          Загрузка...
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-[18px] bg-white px-5 py-8 text-center text-[#8D96B5] shadow-soft">
          Ничего не найдено.
        </div>
      ) : view === 'table' ? (
        <RegistryTableView
          items={pageItems}
          variant={tab}
          onOpenProfile={onOpenProfile}
          onContact={setContactTarget}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((user) => (
            <RegistryCard
              key={user.id}
              {...user}
              variant={isApplicantsTab ? 'applicant' : 'specialist'}
              onOpenProfile={onOpenProfile}
              onContact={setContactTarget}
              canContact={user.isCertified}
            />
          ))}
        </div>
      )}

      <DashboardPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {contactTarget ? (
        <SpecialistContactModal
          specialistId={contactTarget.id}
          specialistName={contactTarget.fullName}
          open={Boolean(contactTarget)}
          onClose={() => setContactTarget(null)}
        />
      ) : null}
    </section>
  );
}
