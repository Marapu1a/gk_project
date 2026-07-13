import { queryClient } from '@/lib/queryClient';
import { buildLoginPath } from './authRedirect';

let redirectingToLogin = false;

export function restartAuthentication(to: string, reason?: 'session-expired') {
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  localStorage.removeItem('token');
  queryClient.clear();
  window.location.replace(buildLoginPath(to, reason));
}

export function expireCurrentSession() {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  restartAuthentication(currentPath, 'session-expired');
}
