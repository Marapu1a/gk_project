import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '../api/getUserDetails';

export function useUserDetails(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getUserDetails(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
