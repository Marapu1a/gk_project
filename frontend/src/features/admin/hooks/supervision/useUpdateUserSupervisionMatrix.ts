// src/features/admin/hooks/useUpdateUserSupervisionMatrix.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateUserSupervisionMatrix,
  type UpdateUserSupervisionMatrixBody,
  type UpdateUserSupervisionMatrixResponse,
} from '../../api/supervision/updateUserSupervisionMatrix';

export function useUpdateUserSupervisionMatrix(userId: string) {
  const qc = useQueryClient();

  return useMutation<UpdateUserSupervisionMatrixResponse, Error, UpdateUserSupervisionMatrixBody>({
    mutationFn: (data) => updateUserSupervisionMatrix(userId, data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'supervision-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'hours-review'] }),
        qc.invalidateQueries({ queryKey: ['supervision', 'history'] }),
        qc.invalidateQueries({ queryKey: ['supervision', 'history', 'records'] }),
        qc.invalidateQueries({ queryKey: ['supervisionSummary'] }),
      ]);

      await Promise.all([
        qc.refetchQueries({ queryKey: ['admin', 'supervision-matrix', userId], type: 'active' }),
        qc.refetchQueries({ queryKey: ['admin', 'user', 'details', userId], type: 'active' }),
      ]);
    },
  });
}
