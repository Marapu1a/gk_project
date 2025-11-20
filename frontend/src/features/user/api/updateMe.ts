// src/features/auth/api/updateMe.ts
import { api } from '@/lib/axios';
import type { CurrentUser } from '../../auth/api/me';

export type UpdateMePayload = Partial<{
  fullName: string;
  fullNameLatin: string;
  phone: string;
  birthDate: string; // 'YYYY-MM-DD' или ISO
  country: string;
  city: string;
  avatarUrl: string;
  bio: string;
}>;

export async function updateMe(payload: UpdateMePayload): Promise<CurrentUser> {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}
