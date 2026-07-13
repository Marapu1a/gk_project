import { describe, expect, it } from 'vitest';
import { buildLoginPath, normalizePostLoginRedirect } from './authRedirect';

describe('auth redirects', () => {
  it('returns to an internal page with its query and hash intact', () => {
    expect(normalizePostLoginRedirect('/admin/users/42?tab=payments#history')).toBe(
      '/admin/users/42?tab=payments#history',
    );
  });

  it('rejects external and protocol-relative redirect targets', () => {
    expect(normalizePostLoginRedirect('https://example.com')).toBe('/dashboard-v2');
    expect(normalizePostLoginRedirect('//example.com/path')).toBe('/dashboard-v2');
  });

  it('does not redirect back into an authentication page', () => {
    expect(normalizePostLoginRedirect('/login?force=1')).toBe('/dashboard-v2');
    expect(normalizePostLoginRedirect('/reset-password?token=secret')).toBe('/dashboard-v2');
  });

  it('keeps legacy route redirects working', () => {
    expect(normalizePostLoginRedirect('/dashboard')).toBe('/dashboard-v2');
    expect(normalizePostLoginRedirect('/history')).toBe('/supervision/hours?panel=history');
    expect(normalizePostLoginRedirect('/review/supervision')).toBe(
      '/reviewer/candidates/supervision',
    );
  });

  it('builds a login URL that preserves the requested page', () => {
    const loginPath = buildLoginPath('/admin/users/42?tab=payments', 'session-expired');
    const url = new URL(loginPath, 'https://cabinet.example');

    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('to')).toBe('/admin/users/42?tab=payments');
    expect(url.searchParams.get('reason')).toBe('session-expired');
  });
});
