// src/features/user/hooks/useSetBio.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setBio } from '../api/setBio';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';

export function useSetBio(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bio: string | null) => setBio(userId, bio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: currentUserQueryKey });
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
      qc.invalidateQueries({ queryKey: ['registry-profile', userId] });
    },
  });
}
