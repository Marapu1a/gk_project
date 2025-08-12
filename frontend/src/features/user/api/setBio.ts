// src/features/user/api/setBio.ts
import { api } from '@/lib/axios';

export async function setBio(userId: string, bio: string | null) {
  const { data } = await api.patch(`/users/${userId}/bio`, { bio });
  return data as { id: string; bio: string | null };
}
