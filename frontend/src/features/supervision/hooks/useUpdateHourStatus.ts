// src/features/supervision/hooks/useUpdateHourStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateSupervisionHour,
  type UpdateHourStatusInput,
  type UpdateSupervisionHourResponse,
} from '../api/updateSupervisionHour';

export function useUpdateHourStatus() {
  const qc = useQueryClient();

  return useMutation<UpdateSupervisionHourResponse, Error, UpdateHourStatusInput>({
    mutationFn: updateSupervisionHour,
    onSuccess: async () => {
      // ревью-инбокс
      await qc.invalidateQueries({ queryKey: ['review', 'supervision'] });
      await qc.invalidateQueries({ queryKey: ['supervision', 'assigned'] });

      // история и список
      await qc.invalidateQueries({ queryKey: ['supervision', 'history'] });
      await qc.invalidateQueries({ queryKey: ['supervision', 'list'] });

      // прогресс и CEU
      await qc.invalidateQueries({ queryKey: ['supervision', 'summary'] });
      await qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
    },
  });
}
