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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'supervision-matrix', userId] });
    },
  });
}
