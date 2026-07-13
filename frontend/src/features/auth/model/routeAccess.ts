import type { CurrentUser } from '../api/me';

export type RouteAccess = 'authenticated' | 'admin' | 'reviewer';

type AccessUser = Pick<CurrentUser, 'role' | 'groups'>;

export function canAccessRoute(
  user: AccessUser,
  access: RouteAccess,
  reviewerKind?: string,
): boolean {
  if (access === 'authenticated') return true;
  if (user.role === 'ADMIN') return true;
  if (access === 'admin') return false;

  const groupNames = user.groups.map((group) => group.name);
  const isExperiencedSupervisor = groupNames.includes('Опытный Супервизор');
  const isSupervisor = groupNames.includes('Супервизор') || isExperiencedSupervisor;

  if (reviewerKind === 'mentorship') return isExperiencedSupervisor;
  if (reviewerKind === 'supervision') return isSupervisor;

  return false;
}
