// src/features/auth/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser, type CurrentUser } from '../api/me';

export const currentUserQueryKey = ['me'] as const;

export function useCurrentUser({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<CurrentUser>({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 минут
    enabled,
  });
}
