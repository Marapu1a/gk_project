// src/features/groups/api/searchUsers.ts
import { api } from '@/lib/axios';

export type UserSuggestion = {
  id: string;
  fullName: string;
  email: string;
  groupName: string | null; // активная группа (статус) или null
};

export async function searchUsers(
  q: string,
  limit = 8,
  signal?: AbortSignal
): Promise<UserSuggestion[]> {
  const { data } = await api.get('/admin/users/search', {
    params: { q, limit },
    signal,
  });
  return data as UserSuggestion[];
}
