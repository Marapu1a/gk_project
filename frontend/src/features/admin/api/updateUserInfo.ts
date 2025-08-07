// src/features/admin/api/updateUserInfo.ts

import { api } from "@/lib/axios";

export type UpdateUserInfoPayload = {
  fullName?: string;
  phone?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  avatarUrl?: string;
};

export async function updateUserInfo(userId: string, payload: UpdateUserInfoPayload) {
  const response = await api.patch(`/admin/users/${userId}`, payload);
  return response.data;
}
