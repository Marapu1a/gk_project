// src/features/ceu/hooks/useUpdateCEUEntry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCEUEntry } from '../api/updateEntry';

export function useUpdateCEUEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, rejectedReason }: { id: string; status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED'; rejectedReason?: string }) =>
      updateCEUEntry(id, { status, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ceu'] });
    },
  });
}

