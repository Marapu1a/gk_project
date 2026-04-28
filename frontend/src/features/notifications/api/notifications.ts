// src/features/notifications/api/notifications.ts
import { api } from '@/lib/axios';

export type Notification = {
  id: string;
  type: 'CEU' | 'SUPERVISION' | 'MENTORSHIP' | 'DOCUMENT' | 'EXAM' | 'PAYMENT' | 'NEW_USER';
  message: string;
  link: string | null;
  createdAt: string;
  isRead: boolean; // 👈 новое поле
};

export async function getNotifications(): Promise<Notification[]> {
  const res = await api.get('/notifications');
  return res.data;
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

// 👇 новое — отметить как прочитанное
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}
