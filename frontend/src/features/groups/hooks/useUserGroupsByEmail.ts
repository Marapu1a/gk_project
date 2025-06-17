import { useQuery } from '@tanstack/react-query';
import { getUserGroupsByEmail, type UserGroupsResponse } from '../api/getUserGroupsByEmail';

export function useUserGroupsByEmail(email: string, enabled: boolean) {
  return useQuery<UserGroupsResponse>({
    queryKey: ['groups', 'user', email],
    queryFn: () => getUserGroupsByEmail(email),
    enabled,
  });
}
