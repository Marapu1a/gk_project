import { api } from '@/lib/axios';

export async function createUserNote(userId: string, text: string) {
  const { data } = await api.post(`/admin/users/${userId}/notes`, { text });
  return data as { ok: boolean };
}
