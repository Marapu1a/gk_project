import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '../api/getUserDetails';
import type { UserDetailsResponse } from '../api/getUserDetails';

export function useUserDetails(userId: string) {
  return useQuery<UserDetailsResponse>({
    queryKey: ['userDetails', userId],
    queryFn: () => getUserDetails(userId),
    enabled: !!userId,
  });
}
