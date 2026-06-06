import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTargetLevel } from '../api/updateTargetLevel';
import { toast } from 'sonner';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
type GoalMode = 'CERTIFICATION' | 'RENEWAL';

export function useUpdateTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { targetLevel: TargetLevel; goalMode?: GoalMode }) =>
      updateTargetLevel(userId, payload),

    onSuccess: async () => {
      toast.success('Целевой уровень обновлён');

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['admin-ceu-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'supervision-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['groups', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
        qc.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'supervision', 'reviewerCandidates'] }),
      ]);
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Ошибка обновления targetLevel');
    },
  });
}
