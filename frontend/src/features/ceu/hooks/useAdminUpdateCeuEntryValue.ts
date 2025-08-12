// src/features/ceu/hooks/useAdminUpdateCeuEntryValue.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUpdateCeuEntryValue } from '../api/adminUpdateCeuEntryValue';

export function useAdminUpdateCeuEntryValue(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, value }: { entryId: string; value: number }) =>
      adminUpdateCeuEntryValue(entryId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
    },
  });
}
