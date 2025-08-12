// src/features/auth/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser, type CurrentUser } from '../api/me';

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
