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
  bio: string | null;
  targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
  targetLockRank: number | null; // ⬅️ добавили
  groups: { id: string; name: string }[];
  activeGroup: { id: string; name: string; rank: number } | null;
};

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get('/auth/me');
  return data;
}

/** Проверяет, заблокирован ли выбор новой цели */
export function isTargetLocked(user: CurrentUser | null | undefined): boolean {
  if (!user?.activeGroup) return false;
  if (!user.targetLevel) return false; // цель ещё не выбрана
  return user.targetLockRank === user.activeGroup.rank;
}
