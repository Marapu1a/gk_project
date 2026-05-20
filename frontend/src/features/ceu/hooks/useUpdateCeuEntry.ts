// src/features/ceu/hooks/useUpdateCEUEntry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCEUEntry, type UpdateCEUEntryPayload } from '../api/updateEntry';

export function useUpdateCEUEntry(userId?: string, email?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateCEUEntryPayload) =>
      updateCEUEntry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'history'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      if (email) qc.invalidateQueries({ queryKey: ['ceu', 'review', email] });
      if (userId) qc.invalidateQueries({ queryKey: ['ceu', 'records', userId] });
    },
  });
}
