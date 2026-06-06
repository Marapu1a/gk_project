import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { abandonActiveCycle } from '../api/abandonActiveCycle';

export function useAbandonActiveCycle(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => abandonActiveCycle(userId, reason),

    onSuccess: async () => {
      toast.success('Активный цикл отменён');

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
      toast.error(err?.response?.data?.error || 'Ошибка отмены цикла');
    },
  });
}
