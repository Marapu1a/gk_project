import { api } from '@/lib/axios';

export type AdminUserActionLogItem = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  adminEmail: string;
  adminName: string | null;
};

export async function getUserActionLog(userId: string) {
  const { data } = await api.get<AdminUserActionLogItem[]>(
    `/admin/users/${userId}/action-log`,
  );
  return data;
}
