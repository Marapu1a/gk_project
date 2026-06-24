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
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-ceu-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] }),
        qc.invalidateQueries({ queryKey: ['ceuSummary'] }),
      ]);

      await Promise.all([
        qc.refetchQueries({ queryKey: ['admin-ceu-matrix', userId], type: 'active' }),
        qc.refetchQueries({ queryKey: ['admin', 'user', 'details', userId], type: 'active' }),
      ]);
    },
  });
}
