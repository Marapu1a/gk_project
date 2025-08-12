// src/features/files/api/setAvatarUrl.ts
import { api } from '@/lib/axios';

export async function setAvatarUrl(userId: string, avatarUrl: string | null) {
  const { data } = await api.patch(`/users/${userId}/avatar-url`, { avatarUrl });
  return data as { id: string; avatarUrl: string | null };
}
