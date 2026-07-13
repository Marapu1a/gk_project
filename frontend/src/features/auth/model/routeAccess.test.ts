import { describe, expect, it } from 'vitest';
import { canAccessRoute } from './routeAccess';

const user = (role: 'STUDENT' | 'REVIEWER' | 'ADMIN', groupNames: string[] = []) => ({
  role,
  groups: groupNames.map((name, index) => ({ id: String(index), name })),
});

describe('route access', () => {
  it('allows every signed-in user to authenticated pages', () => {
    expect(canAccessRoute(user('STUDENT'), 'authenticated')).toBe(true);
  });

  it('keeps admin pages restricted to admins', () => {
    expect(canAccessRoute(user('ADMIN'), 'admin')).toBe(true);
    expect(canAccessRoute(user('REVIEWER'), 'admin')).toBe(false);
    expect(canAccessRoute(user('STUDENT'), 'admin')).toBe(false);
  });

  it('allows a supervisor to review supervision but not mentorship', () => {
    const supervisor = user('REVIEWER', ['Супервизор']);

    expect(canAccessRoute(supervisor, 'reviewer', 'supervision')).toBe(true);
    expect(canAccessRoute(supervisor, 'reviewer', 'mentorship')).toBe(false);
  });

  it('allows an experienced supervisor to review both kinds', () => {
    const experiencedSupervisor = user('REVIEWER', ['Опытный Супервизор']);

    expect(canAccessRoute(experiencedSupervisor, 'reviewer', 'supervision')).toBe(true);
    expect(canAccessRoute(experiencedSupervisor, 'reviewer', 'mentorship')).toBe(true);
  });

  it('allows admins through reviewer routes just like the backend', () => {
    expect(canAccessRoute(user('ADMIN'), 'reviewer', 'supervision')).toBe(true);
    expect(canAccessRoute(user('ADMIN'), 'reviewer', 'mentorship')).toBe(true);
  });

  it('rejects unknown reviewer route kinds instead of guessing access', () => {
    expect(canAccessRoute(user('REVIEWER', ['Опытный Супервизор']), 'reviewer', 'unknown')).toBe(
      false,
    );
  });
});
