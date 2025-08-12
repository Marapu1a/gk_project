// src/features/supervision/hooks/useAdminUpdateSupervisionHourValue.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUpdateSupervisionHourValue } from '../api/adminUpdateSupervisionHourValue';

export function useAdminUpdateSupervisionHourValue(userId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      adminUpdateSupervisionHourValue(id, value),
    onSuccess: () => {
      if (userId) {
        qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      }
      qc.invalidateQueries({ queryKey: ['supervision', 'summary'] });
    },
  });
}
