import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '../api/getUserDetails';

export const adminUserDetailsQueryKeyPrefix = ['admin', 'user', 'details'] as const;
export const adminUserDetailsQueryKey = (id: string) =>
  [...adminUserDetailsQueryKeyPrefix, id] as const;

export function useUserDetails(id: string) {
  return useQuery({
    queryKey: adminUserDetailsQueryKey(id),
    queryFn: () => getUserDetails(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
