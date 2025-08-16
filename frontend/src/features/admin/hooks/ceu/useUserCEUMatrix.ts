// src/features/admin/hooks/useUserCEUMatrix.ts
import { useQuery } from '@tanstack/react-query';
import { getUserCEUMatrix, type CEUMatrixResponse } from '../../api/ceu/getUserCEUMatrix';

export function useUserCEUMatrix(userId: string) {
  return useQuery<CEUMatrixResponse>({
    queryKey: ['admin-ceu-matrix', userId],
    queryFn: () => getUserCEUMatrix(userId),
    enabled: !!userId,
  });
}
