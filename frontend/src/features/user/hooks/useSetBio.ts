// src/features/user/hooks/useSetBio.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setBio } from '../api/setBio';

export function useSetBio(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bio: string | null) => setBio(userId, bio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['registry-profile', userId] });
    },
  });
}
