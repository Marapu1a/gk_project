import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTargetLevel } from '../api/updateTargetLevel';
import { toast } from 'sonner';

export function useUpdateTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (level: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null) =>
      updateTargetLevel(userId, level),

    onSuccess: async () => {
      toast.success('Целевой уровень обновлён');

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['groups', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
        qc.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
      ]);
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Ошибка обновления targetLevel');
    },
  });
}
