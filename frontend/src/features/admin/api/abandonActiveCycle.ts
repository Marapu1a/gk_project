import { api } from '@/lib/axios';

export async function abandonActiveCycle(userId: string, reason: string) {
  const { data } = await api.patch(`/users/${userId}/abandon-cycle`, {
    reason,
  });

  return data;
}
