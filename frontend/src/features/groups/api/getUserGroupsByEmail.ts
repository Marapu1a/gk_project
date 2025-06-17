// src/features/groups/api/getUserGroupsByEmail.ts
import { api } from '@/lib/axios';

export type UserGroupsResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  currentGroupIds: string[];
  allGroups: {
    id: string;
    name: string;
    rank: number;
  }[];
};

export async function getUserGroupsByEmail(email: string): Promise<UserGroupsResponse> {
  const res = await api.get(`/admin/users/by-email/${encodeURIComponent(email)}/groups`);
  return res.data;
}

