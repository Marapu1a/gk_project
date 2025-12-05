import { api } from '@/lib/axios';

export async function updateTargetLevel(userId: string, targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null) {
  const response = await api.patch(`/admin/users/${userId}/target-level`, {
    targetLevel,
  });

  return response.data as { ok: true; targetLevel: string | null };
}
