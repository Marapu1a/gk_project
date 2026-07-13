// src/features/ceu/hooks/useUpdateCEUEntry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCEURecord, updateCEUEntry, type UpdateCEUEntryPayload } from '../api/updateEntry';
import { ceuSummaryQueryKey } from './useCeuSummary';

export function useUpdateCEUEntry(userId?: string, email?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateCEUEntryPayload) =>
      updateCEUEntry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] });
      qc.invalidateQueries({ queryKey: ceuSummaryQueryKey });
      qc.invalidateQueries({ queryKey: ['ceu', 'history'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      if (email) qc.invalidateQueries({ queryKey: ['ceu', 'review', email] });
      if (userId) qc.invalidateQueries({ queryKey: ['ceu', 'records', userId] });
    },
  });
}

export function useDeleteCEURecord(userId?: string, email?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => deleteCEURecord(recordId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] });
      qc.invalidateQueries({ queryKey: ceuSummaryQueryKey });
      qc.invalidateQueries({ queryKey: ['ceu', 'history'] });
      qc.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      if (email) qc.invalidateQueries({ queryKey: ['ceu', 'review', email] });
      if (userId) qc.invalidateQueries({ queryKey: ['ceu', 'records', userId] });
    },
  });
}
