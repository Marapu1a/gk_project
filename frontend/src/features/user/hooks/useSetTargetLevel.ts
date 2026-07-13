// src/features/user/hooks/useSetTargetLevel.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  setTargetLevel,
  type SetTargetLevelPayload,
  type SetTargetLevelResponse,
} from '../api/setTargetLevel';
import { type CurrentUser } from '@/features/auth/api/me';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { ceuSummaryQueryKey } from '@/features/ceu/hooks/useCeuSummary';
import { supervisionSummaryQueryKey } from '@/features/supervision/hooks/useSupervisionSummary';

type Ctx = { prev?: CurrentUser };

export function useSetTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation<SetTargetLevelResponse, unknown, SetTargetLevelPayload, Ctx>({
    mutationFn: (payload) => setTargetLevel(userId, payload),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: currentUserQueryKey });

      const prev = qc.getQueryData<CurrentUser>(currentUserQueryKey);

      if (prev) {
        qc.setQueryData<CurrentUser>(currentUserQueryKey, {
          ...prev,
          targetLevel: payload.targetLevel ?? null,
        });
      }

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<CurrentUser>(currentUserQueryKey, ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: currentUserQueryKey });
      qc.invalidateQueries({ queryKey: ['payments'] });

      // CEU summary
      qc.invalidateQueries({ queryKey: ceuSummaryQueryKey });

      // supervision summary
      qc.invalidateQueries({ queryKey: supervisionSummaryQueryKey });
    },
  });
}
