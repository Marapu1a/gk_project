// src/features/groups/hooks/useUserGroupsById.ts
import { useQuery } from '@tanstack/react-query';
import { getUserGroupsById, type UserGroupsByIdResponse } from '../api/getUserGroupsById';
import { userGroupsQueryKey } from './userGroupQueryKeys';

export function useUserGroupsById(userId: string, enabled = true) {
  return useQuery<UserGroupsByIdResponse>({
    queryKey: userGroupsQueryKey(userId),
    queryFn: ({ signal }) => getUserGroupsById(userId, signal),
    enabled: !!userId && enabled,
    staleTime: 60_000,
  });
}
