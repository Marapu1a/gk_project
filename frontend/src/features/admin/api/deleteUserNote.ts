import { api } from '@/lib/axios';

export async function deleteUserNote(userId: string, noteId: string) {
  const { data } = await api.delete(`/admin/users/${userId}/notes/${noteId}`);
  return data as { ok: boolean };
}
