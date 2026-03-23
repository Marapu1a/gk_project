import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { abandonActiveCycle } from '../api/abandonActiveCycle';

export function useAbandonActiveCycle(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => abandonActiveCycle(userId, reason),

    onSuccess: () => {
      toast.success('Активный цикл отменён');
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['user-groups', userId] });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Ошибка отмены цикла');
    },
  });
}
