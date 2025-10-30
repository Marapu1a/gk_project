// src/features/groups/api/getUserGroupsById.ts
import { api } from "@/lib/axios";

export type Group = { id: string; name: string; rank: number };
export type UserGroupsByIdResponse = {
  user: { id: string; fullName: string; email: string };
  currentGroupIds: string[];
  allGroups: Group[];
};

export async function getUserGroupsById(userId: string, signal?: AbortSignal) {
  const { data } = await api.get<UserGroupsByIdResponse>(`/admin/users/${userId}/groups`, { signal });
  return data;
}
