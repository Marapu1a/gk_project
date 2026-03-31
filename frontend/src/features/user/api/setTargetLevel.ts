import { api } from '@/lib/axios';

export type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
export type GoalMode = 'CERTIFICATION' | 'RENEWAL';

export type SetTargetLevelResponse = {
  id: string;
  targetLevel: TargetLevel;
  targetLockRank: number | null;
  resetCount: number;
  goalMode: GoalMode;
};

export type SetTargetLevelPayload = {
  targetLevel: TargetLevel;
  goalMode?: GoalMode;
};

export async function setTargetLevel(
  userId: string,
  payload: SetTargetLevelPayload,
): Promise<SetTargetLevelResponse> {
  const { data } = await api.patch<SetTargetLevelResponse>(
    `/users/${userId}/target-level`,
    {
      targetLevel: payload.targetLevel,
      goalMode: payload.goalMode ?? 'CERTIFICATION',
    },
  );

  return data;
}
