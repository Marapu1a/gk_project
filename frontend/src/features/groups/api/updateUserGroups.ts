// src/features/groups/api/useUpdateUserGroups.ts
import { api } from '@/lib/axios';

export async function updateUserGroups(userId: string, groupIds: string[]): Promise<{ success: true }> {
  const res = await api.post(`/admin/users/${userId}/groups`, { groupIds });
  return res.data;
}

