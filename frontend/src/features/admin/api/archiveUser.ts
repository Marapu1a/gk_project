import { api } from '@/lib/axios';

export async function archiveUser(userId: string, reason?: string) {
  const { data } = await api.patch(`/admin/users/${userId}/archive`, { reason });
  return data;
}

export async function restoreUser(userId: string) {
  const { data } = await api.patch(`/admin/users/${userId}/restore`);
  return data;
}
