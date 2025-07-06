import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../api/getUsers';
import type { GetUsersResponse } from '../api/getUsers';

export function useUsers(params: {
  role?: string;
  group?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  return useQuery<GetUsersResponse>({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
  });
}
