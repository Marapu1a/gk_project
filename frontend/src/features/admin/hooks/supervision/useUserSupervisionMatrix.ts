// src/features/admin/hooks/useUserSupervisionMatrix.ts
import { useQuery } from '@tanstack/react-query';
import { getUserSupervisionMatrix } from '../../api/supervision/getUserSupervisionMatrix';

export function useUserSupervisionMatrix(userId: string) {
  return useQuery({
    queryKey: ['admin', 'supervision-matrix', userId],
    queryFn: () => getUserSupervisionMatrix(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
