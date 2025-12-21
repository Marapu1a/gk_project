import type { RegistryCard as RegistryCardType } from '../features/registry/api/getRegistry';

export type SortKey = 'name' | 'location' | 'group' | 'createdAt';
export type SortDir = 'asc' | 'desc';

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();

const hasAvatar = (u: RegistryCardType) => Boolean((u as any).avatarUrl);
const hasCity = (u: RegistryCardType) => Boolean(u.city && u.city.trim().length > 0);

/**
 * Детерминированный shuffle (не прыгает при каждом рендере)
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;

  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

/**
 * Seed, меняющийся раз в сутки
 */
function getDailySeed(): number {
  return Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
}

/**
 * BASE SORT
 * Жёсткое бизнес-ранжирование БЕЗ рандома
 * (выделено отдельно для тестируемости)
 */
function baseSort(items: RegistryCardType[]): RegistryCardType[] {
  const arr = [...items];

  arr.sort((a, b) => {
    // 1) уровень (абсолютный приоритет)
    const aRank = a.groupRank ?? 0;
    const bRank = b.groupRank ?? 0;
    if (aRank !== bRank) return bRank - aRank;

    // 2) аватарка
    const aAv = hasAvatar(a);
    const bAv = hasAvatar(b);
    if (aAv !== bAv) return aAv ? -1 : 1;

    // 3) город
    const aCity = hasCity(a);
    const bCity = hasCity(b);
    if (aCity !== bCity) return aCity ? -1 : 1;

    // 4) дата регистрации (новые выше)
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (aTime !== bTime) return bTime - aTime;

    // 5) стабильность
    const aName = norm(a.fullName || '');
    const bName = norm(b.fullName || '');
    if (aName !== bName) return aName < bName ? -1 : 1;

    return String(a.id).localeCompare(String(b.id));
  });

  return arr;
}

/**
 * SMART DEFAULT SORT
 * Жёсткое бизнес-ранжирование + контролируемый рандом в топ-40
 */
export function smartDefaultSort(items: RegistryCardType[]): RegistryCardType[] {
  const sorted = baseSort(items);

  const TOP_N = 40;
  if (sorted.length <= 1) return sorted;

  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);

  const seed = getDailySeed();
  const shuffledTop = seededShuffle(top, seed);

  return [...shuffledTop, ...rest];
}

/**
 * USER SORT (ручная сортировка)
 */
export function userSort(
  items: RegistryCardType[],
  sortKey: SortKey,
  sortDir: SortDir,
): RegistryCardType[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  const arr = [...items];

  arr.sort((a, b) => {
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
      return 0;
    }

    // createdAt
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (aTime < bTime) return -1 * dir;
    if (aTime > bTime) return 1 * dir;
    return 0;
  });

  return arr;
}
