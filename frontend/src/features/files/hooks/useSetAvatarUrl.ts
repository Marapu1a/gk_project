// src/features/files/hooks/useSetAvatarUrl.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

async function setAvatarUrl(userId: string, avatarUrl: string | null) {
  const { data } = await api.patch(`/users/${userId}/avatar-url`, { avatarUrl });
  return data;
}

export function useSetAvatarUrl(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (url: string | null) => setAvatarUrl(userId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }); // <-- ВАЖНО
    }
  });
}
