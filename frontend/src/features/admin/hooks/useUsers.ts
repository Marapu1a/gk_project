import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../api/getUsers';

export function useUsers(params: { search?: string; page?: number; perPage?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getUsers(params),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}
