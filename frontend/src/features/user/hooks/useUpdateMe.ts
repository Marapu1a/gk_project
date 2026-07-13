// src/features/auth/hooks/useUpdateMe.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMe, type UpdateMePayload } from '../api/updateMe';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { adminUsersQueryKey } from '@/features/admin/hooks/useUsers';

export function useUpdateMe() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMePayload) => updateMe(payload),
    onSuccess: (user) => {
      // мягкое обновление, не убивает поля, которых нет в ответе
      qc.setQueryData(currentUserQueryKey, (old: any) => {
        if (!old) return user;
        return { ...old, ...user };
      });
      qc.invalidateQueries({ queryKey: adminUsersQueryKey });
    },
  });
}
