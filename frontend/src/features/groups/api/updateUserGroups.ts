// src/features/groups/api/useUpdateUserGroups.ts
import { api } from '@/lib/axios';

export type UpdateUserGroupsResponse = {
  success: true;
  upgraded: boolean;
  burned: number;
  oldMaxRank: number;
  newMaxRank: number;
  examReset: boolean;
  examPaymentReset: boolean;
  examPaymentResetCount: number;
};

export async function updateUserGroups(
  userId: string,
  groupIds: string[]
): Promise<UpdateUserGroupsResponse> {
  const res = await api.post<UpdateUserGroupsResponse>(`/admin/users/${userId}/groups`, { groupIds });
  return res.data;
}
