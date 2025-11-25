// src/features/user/api/setTargetLevel.ts (или где он у тебя лежит)
import { api } from '@/lib/axios';

export type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;

export type SetTargetLevelResponse = {
  id: string;
  targetLevel: TargetLevel;
  targetLockRank: number | null;
  resetCount: number;
};

export async function setTargetLevel(
  userId: string,
  targetLevel: TargetLevel,
): Promise<SetTargetLevelResponse> {
  const { data } = await api.patch<SetTargetLevelResponse>(
    `/users/${userId}/target-level`,
    { targetLevel },
  );

  return data;
}
