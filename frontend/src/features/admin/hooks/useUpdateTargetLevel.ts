import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTargetLevel } from '../api/updateTargetLevel';
import { toast } from 'sonner';

export function useUpdateTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (level: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null) =>
      updateTargetLevel(userId, level),

    onSuccess: () => {
      toast.success('Целевой уровень обновлён');
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Ошибка обновления targetLevel');
    },
  });
}
