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

const hasAvatar = (u: User) =>
  typeof u.avatarUrl === 'string' && u.avatarUrl.trim().length > 0;

const hasCity = (u: User) =>
  typeof u.city === 'string' && u.city.trim().length > 0;

const isCandidate = (u: User) =>
  norm(u.groupName ?? '') === norm('Соискатель');

function baseComparator(a: User, b: User): number {
  // 1) НЕ соискатели выше соискателей
  const aCand = isCandidate(a);
  const bCand = isCandidate(b);
  if (aCand !== bCand) return aCand ? 1 : -1;

  // 2) аватарка выше
  const aAv = hasAvatar(a);
  const bAv = hasAvatar(b);
  if (aAv !== bAv) return aAv ? -1 : 1;

  // 3) уровень выше
  const aRank = a.groupRank ?? 0;
  const bRank = b.groupRank ?? 0;
  if (aRank !== bRank) return bRank - aRank;

  // 4) город выше
  const aCity = hasCity(a);
  const bCity = hasCity(b);
  if (aCity !== bCity) return aCity ? -1 : 1;

  // 5) дата регистрации (новые выше)
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
  if (aTime !== bTime) return bTime - aTime;

  // 6) стабильность по имени
  const aName = norm(a.fullName || '');
  const bName = norm(b.fullName || '');
  if (aName !== bName) return aName < bName ? -1 : 1;

  // 7) стабильность по id
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

  it('non-candidate is always above candidate', () => {
    const sorted = smartDefaultSort([
      user({ fullName: 'Candidate', groupName: 'Соискатель', groupRank: 99, avatarUrl: 'x' as any }),
      user({ fullName: 'Supervisor', groupName: 'Супервизор', groupRank: 1 }),
    ]);

    expect(sorted[0].fullName).toBe('Supervisor');
  });

  it('avatar has priority when candidate status is equal', () => {
    const sorted = smartDefaultSort([
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'NoAvatar' }),
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'WithAvatar', avatarUrl: 'x' as any }),
    ]);

    expect(sorted[0].fullName).toBe('WithAvatar');
  });

  it('empty avatarUrl is treated as no avatar', () => {
    const sorted = smartDefaultSort([
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'EmptyAvatar', avatarUrl: '   ' as any }),
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'WithAvatar', avatarUrl: 'x' as any }),
    ]);

    expect(sorted[0].fullName).toBe('WithAvatar');
  });

  it('higher groupRank is above lower when candidate status and avatar presence are equal', () => {
    const sorted = smartDefaultSort([
      user({ groupName: 'Супервизор', groupRank: 1, fullName: 'Low', avatarUrl: 'x' as any }),
      user({ groupName: 'Супервизор', groupRank: 5, fullName: 'High', avatarUrl: 'x' as any }),
    ]);

    expect(sorted[0].fullName).toBe('High');
  });

  it('city has priority after candidate status, avatar, and rank', () => {
    const sorted = smartDefaultSort([
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'NoCity', avatarUrl: 'x' as any }),
      user({ groupName: 'Супервизор', groupRank: 3, fullName: 'WithCity', avatarUrl: 'x' as any, city: 'Москва' }),
    ]);

    expect(sorted[0].fullName).toBe('WithCity');
  });

  it('only top 40 are shuffled (composition preserved; tail unchanged)', () => {
    const users = Array.from({ length: 50 }, (_, i) =>
      user({ groupName: 'Супервизор', groupRank: 1, fullName: `User ${i}` }),
    );

    const baseSorted = [...users].sort(baseComparator);

    const expectedTop40 = new Set(baseSorted.slice(0, 40).map((u) => u.fullName));
    const expectedTail = baseSorted.slice(40).map((u) => u.fullName);

    const result = smartDefaultSort(users);

    const actualTop40 = new Set(result.slice(0, 40).map((u) => u.fullName));
    const actualTail = result.slice(40).map((u) => u.fullName);

    expect(actualTop40).toEqual(expectedTop40);
    expect(actualTail).toEqual(expectedTail);
  });

  it('sorting is deterministic within the same day', () => {
    const users = Array.from({ length: 20 }, (_, i) =>
      user({ groupName: 'Супервизор', groupRank: 1, fullName: `User ${i}` }),
    );

    const a = smartDefaultSort(users).map((u) => u.id);
    const b = smartDefaultSort(users).map((u) => u.id);

    expect(a).toEqual(b);
  });
});
