import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { smartDefaultSort } from './sortRegistry';
import type { RegistryCard as User } from '../features/registry/api/getRegistry';

function user(partial: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    fullName: 'Test User',
    groupRank: 0,
    ...partial,
  } as User;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();

const hasAvatar = (u: User) => Boolean((u as any).avatarUrl);
const hasCity = (u: User) => Boolean(u.city && u.city.trim().length > 0);

function baseComparator(a: User, b: User): number {
  // 1) уровень (desc)
  const aRank = a.groupRank ?? 0;
  const bRank = b.groupRank ?? 0;
  if (aRank !== bRank) return bRank - aRank;

  // 2) аватарка (true выше)
  const aAv = hasAvatar(a);
  const bAv = hasAvatar(b);
  if (aAv !== bAv) return aAv ? -1 : 1;

  // 3) город (true выше)
  const aCity = hasCity(a);
  const bCity = hasCity(b);
  if (aCity !== bCity) return aCity ? -1 : 1;

  // 4) дата регистрации (desc)
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
  if (aTime !== bTime) return bTime - aTime;

  // 5) стабильность по имени
  const aName = norm(a.fullName || '');
  const bName = norm(b.fullName || '');
  if (aName !== bName) return aName < bName ? -1 : 1;

  // 6) стабильность по id
  return String(a.id).localeCompare(String(b.id));
}

describe('smartDefaultSort', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('higher groupRank is always above lower', () => {
    const sorted = smartDefaultSort([
      user({ groupRank: 1, fullName: 'Low' }),
      user({ groupRank: 5, fullName: 'High' }),
    ]);

    expect(sorted[0].fullName).toBe('High');
  });

  it('avatar has priority when ranks are equal', () => {
    const sorted = smartDefaultSort([
      user({ groupRank: 3, fullName: 'NoAvatar' }),
      user({ groupRank: 3, fullName: 'WithAvatar', avatarUrl: 'x' as any }),
    ]);

    expect(sorted[0].fullName).toBe('WithAvatar');
  });

  it('city has priority after avatar', () => {
    const sorted = smartDefaultSort([
      user({ groupRank: 3, fullName: 'NoCity', avatarUrl: 'x' as any }),
      user({ groupRank: 3, fullName: 'WithCity', avatarUrl: 'x' as any, city: 'Москва' }),
    ]);

    expect(sorted[0].fullName).toBe('WithCity');
  });

  it('only top 40 are shuffled (composition preserved; tail unchanged)', () => {
    const users = Array.from({ length: 50 }, (_, i) =>
      user({ groupRank: 1, fullName: `User ${i}` }),
    );

    // Базовый порядок (без шаффла) — именно относительно него определяем "топ-40"
    const baseSorted = [...users].sort(baseComparator);

    const expectedTop40 = new Set(baseSorted.slice(0, 40).map((u) => u.fullName));
    const expectedTail = baseSorted.slice(40).map((u) => u.fullName);

    const result = smartDefaultSort(users);

    const actualTop40 = new Set(result.slice(0, 40).map((u) => u.fullName));
    const actualTail = result.slice(40).map((u) => u.fullName);

    // 1) шаффл не меняет состав топ-40 (только порядок внутри)
    expect(actualTop40).toEqual(expectedTop40);

    // 2) элементы после 40-го места не затрагиваются шаффлом (порядок хвоста совпадает с базовой сортировкой)
    expect(actualTail).toEqual(expectedTail);
  });

  it('sorting is deterministic within the same day', () => {
    const users = Array.from({ length: 20 }, (_, i) =>
      user({ groupRank: 1, fullName: `User ${i}` }),
    );

    const a = smartDefaultSort(users).map((u) => u.id);
    const b = smartDefaultSort(users).map((u) => u.id);

    expect(a).toEqual(b);
  });
});
