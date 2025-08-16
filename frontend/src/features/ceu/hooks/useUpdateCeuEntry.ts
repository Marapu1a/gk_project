// src/features/ceu/hooks/useUpdateCEUEntry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCEUEntry } from '../api/updateEntry';

export function useUpdateCEUEntry(userId?: string, email?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, rejectedReason }: { id: string; status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED'; rejectedReason?: string }) =>
      updateCEUEntry(id, { status, rejectedReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'history'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      if (email) qc.invalidateQueries({ queryKey: ['ceu', 'review', email] });
      if (userId) qc.invalidateQueries({ queryKey: ['ceu', 'records', userId] });
    },
  });
}
