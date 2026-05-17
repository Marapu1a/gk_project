import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveUser, restoreUser } from '../api/archiveUser';

export function useArchiveUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      archiveUser(userId, reason),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      qc.invalidateQueries({ queryKey: ['registry'] });
    },
  });
}

export function useRestoreUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => restoreUser(userId),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      qc.invalidateQueries({ queryKey: ['registry'] });
    },
  });
}
