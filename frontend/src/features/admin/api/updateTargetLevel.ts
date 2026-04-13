import { api } from '@/lib/axios';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
type GoalMode = 'CERTIFICATION' | 'RENEWAL';

export async function updateTargetLevel(
  userId: string,
  payload: {
    targetLevel: TargetLevel;
    goalMode?: GoalMode;
  },
) {
  const response = await api.patch(`/admin/users/${userId}/target-level`, payload);

  return response.data as { ok: true; targetLevel: string | null };
}
