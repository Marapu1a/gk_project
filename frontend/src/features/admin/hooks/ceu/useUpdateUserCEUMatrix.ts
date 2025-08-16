// src/features/admin/hooks/useUpdateUserCEUMatrix.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserCEUMatrix, type UpdateUserCEUMatrixBody, type UpdateUserCEUMatrixResponse } from '../../api/ceu/updateUserCEUMatrix';

export function useUpdateUserCEUMatrix(userId: string) {
  const qc = useQueryClient();

  return useMutation<
    UpdateUserCEUMatrixResponse,
    Error,
    UpdateUserCEUMatrixBody
  >({
    mutationFn: (data) => updateUserCEUMatrix(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ceu-matrix', userId] });
    },
  });
}
