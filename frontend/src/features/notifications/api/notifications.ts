import { api } from "@/lib/axios";

export type Notification = {
  id: string;
  type: 'CEU' | 'SUPERVISION' | 'MENTORSHIP' | 'DOCUMENT';
  message: string;
  link: string | null;
  createdAt: string;
};

export async function getNotifications(): Promise<Notification[]> {
  const res = await api.get('/notifications');
  return res.data;
}

export async function postNotification(data: {
  userId: string;
  type: Notification['type'];
  message: string;
  link?: string;
}): Promise<void> {
  await api.post('/notifications', data);
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
