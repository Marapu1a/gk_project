// src/features/files/hooks/useSetAvatarUrl.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';
import { adminUsersQueryKey } from '@/features/admin/hooks/useUsers';

async function setAvatarUrl(userId: string, avatarUrl: string | null) {
  const { data } = await api.patch(`/users/${userId}/avatar-url`, { avatarUrl });
  return data;
}

export function useSetAvatarUrl(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (url: string | null) => setAvatarUrl(userId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: currentUserQueryKey });
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
      qc.invalidateQueries({ queryKey: adminUsersQueryKey });
      qc.invalidateQueries({ queryKey: ['registry'] });              // ← важно
      qc.invalidateQueries({ queryKey: ['registry-profile', userId] }); // если есть деталь
    },
  });
}
