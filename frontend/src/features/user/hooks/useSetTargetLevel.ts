// src/features/user/hooks/useSetTargetLevel.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  setTargetLevel,
  type SetTargetLevelPayload,
  type SetTargetLevelResponse,
} from '../api/setTargetLevel';
import { type CurrentUser } from '@/features/auth/api/me';

type Ctx = { prev?: CurrentUser };

export function useSetTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation<SetTargetLevelResponse, unknown, SetTargetLevelPayload, Ctx>({
    mutationFn: (payload) => setTargetLevel(userId, payload),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['me'] });

      const prev = qc.getQueryData<CurrentUser>(['me']);

      if (prev) {
        qc.setQueryData<CurrentUser>(['me'], {
          ...prev,
          targetLevel: payload.targetLevel ?? null,
        });
      }

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<CurrentUser>(['me'], ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['payments'] });

      // CEU summary
      qc.invalidateQueries({ queryKey: ['ceuSummary'] });

      // supervision summary
      qc.invalidateQueries({ queryKey: ['supervisionSummary'] });
      qc.invalidateQueries({ queryKey: ['supervision-summary'] });
    },
  });
}
