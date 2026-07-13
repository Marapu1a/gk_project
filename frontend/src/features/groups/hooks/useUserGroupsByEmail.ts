import { useQuery } from '@tanstack/react-query';
import { getUserGroupsByEmail, type UserGroupsResponse } from '../api/getUserGroupsByEmail';
import { userGroupsQueryKey } from './userGroupQueryKeys';

export function useUserGroupsByEmail(email: string, enabled: boolean) {
  return useQuery<UserGroupsResponse>({
    queryKey: userGroupsQueryKey(email),
    queryFn: () => getUserGroupsByEmail(email),
    enabled,
  });
}
