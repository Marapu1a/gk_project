import { api } from '@/lib/axios';

export type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;

export async function setTargetLevel(userId: string, targetLevel: TargetLevel) {
  const { data } = await api.patch(`/users/${userId}/target-level`, {
    targetLevel,
  });
  return data as { id: string; targetLevel: TargetLevel };
}
