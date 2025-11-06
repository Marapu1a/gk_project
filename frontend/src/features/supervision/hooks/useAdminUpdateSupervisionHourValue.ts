// src/features/supervision/hooks/useAdminUpdateSupervisionHourValue.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUpdateSupervisionHourValue } from '../api/adminUpdateSupervisionHourValue';

export function useAdminUpdateSupervisionHourValue(userId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) =>
      adminUpdateSupervisionHourValue(id, value),
    onSuccess: async () => {
      if (userId) {
        await qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
        await qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      }
      await qc.invalidateQueries({ queryKey: ['supervision', 'summary'] });
    },
  });
}
