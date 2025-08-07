import { useQuery } from '@tanstack/react-query';
import { getUserPayments } from '../api/getUserPayments';

export function useUserPayments() {
  return useQuery({
    queryKey: ['payments', 'user'],
    queryFn: getUserPayments,
    staleTime: 60 * 1000,
  });
}
