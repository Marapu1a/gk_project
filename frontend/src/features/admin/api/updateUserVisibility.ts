import { api } from '@/lib/axios';

export async function updateUserVisibility(userId: string, isProfileVisible: boolean) {
  const response = await api.patch(`/admin/users/${userId}/visibility`, {
    isProfileVisible,
  });

  return response.data as {
    ok: true;
    isProfileVisible: boolean;
  };
}
