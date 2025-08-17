// src/features/auth/hooks/useUpdateMe.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMe, type UpdateMePayload } from '../api/updateMe';

export function useUpdateMe() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMePayload) => updateMe(payload),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user); // этого достаточно
    },
  });
}
