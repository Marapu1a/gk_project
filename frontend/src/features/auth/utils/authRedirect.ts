const DEFAULT_AUTHENTICATED_PATH = '/dashboard-v2';
const AUTH_ENTRY_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function normalizePostLoginRedirect(to: string | null): string {
  if (!to || !to.startsWith('/') || to.startsWith('//')) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  const pathname = to.split(/[?#]/, 1)[0];
  if (AUTH_ENTRY_PATHS.includes(pathname)) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  if (pathname === '/dashboard') return DEFAULT_AUTHENTICATED_PATH;
  if (pathname === '/history') return '/supervision/hours?panel=history';
  if (pathname === '/review/supervision') return '/reviewer/candidates/supervision';

  return to;
}

export function buildLoginPath(to: string, reason?: 'session-expired'): string {
  const params = new URLSearchParams({ to: normalizePostLoginRedirect(to) });
  if (reason) params.set('reason', reason);
  return `/login?${params.toString()}`;
}
