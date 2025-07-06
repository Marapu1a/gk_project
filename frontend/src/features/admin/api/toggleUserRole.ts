import { api } from '@/lib/axios';

export async function toggleUserRole(userId: string) {
  const response = await api.patch(`/admin/users/${userId}/role`);
  return response.data;
}
