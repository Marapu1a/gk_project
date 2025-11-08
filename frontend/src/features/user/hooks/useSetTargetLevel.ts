import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTargetLevel, type TargetLevel } from '../api/setTargetLevel';
import { type CurrentUser } from '@/features/auth/api/me';

export function useSetTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (target: TargetLevel) => setTargetLevel(userId, target),

    // лёгкий оптимизм: обновим кеш /me сразу
    onMutate: async (target) => {
      await qc.cancelQueries({ queryKey: ['me'] });
      const prev = qc.getQueryData<CurrentUser>(['me']);
      if (prev) {
        qc.setQueryData<CurrentUser>(['me'], { ...prev, targetLevel: (target ?? null) as any });
      }
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['me'], ctx.prev); // откат
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['ceu-summary'] });
      qc.invalidateQueries({ queryKey: ['supervision-summary'] });
    },
  });
}
