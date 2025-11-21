// src/features/admin/api/updateUserPassword.ts
import { api } from '@/lib/axios';

export type UpdateUserPasswordBody = {
  password: string;
};

export type UpdateUserPasswordResponse = {
  ok: true;
};

export async function updateUserPassword(
  userId: string,
  body: UpdateUserPasswordBody
): Promise<UpdateUserPasswordResponse> {
  const { data } = await api.patch<UpdateUserPasswordResponse>(
    `/admin/users/${userId}/password`,
    body
  );
  return data;
}
