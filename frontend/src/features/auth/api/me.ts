// src/features/auth/api/me.ts
import { api } from '@/lib/axios';

export type CurrentUser = {
  id: string;
  email: string;
  role: 'STUDENT' | 'REVIEWER' | 'ADMIN';
  fullName: string;
  phone: string | null;
  birthDate: string | null; // ISO
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
  groups: { id: string; name: string }[];
  activeGroup: { id: string; name: string; rank: number } | null;
};

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get('/auth/me');
  return data;
}
