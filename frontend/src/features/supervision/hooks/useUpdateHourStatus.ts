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
    onSuccess: () => {
      // инбокс ревьюера (старый ключ оставим для совместимости)
      qc.invalidateQueries({ queryKey: ['review', 'supervision'] });
      qc.invalidateQueries({ queryKey: ['supervision', 'assigned'] });

      // история пользователя / список записей
      qc.invalidateQueries({ queryKey: ['supervision', 'history'] });
      qc.invalidateQueries({ queryKey: ['supervision', 'list'] });

      // сводки/прогресс
      qc.invalidateQueries({ queryKey: ['supervision', 'summary'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
    },
  });
}
