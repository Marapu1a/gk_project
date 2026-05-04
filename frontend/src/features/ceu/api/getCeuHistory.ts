// src/features/ceu/api/getCeuHistory.ts
import { api } from '@/lib/axios';

export interface CeuHistoryItem {
  id: string;
  category: 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
  rejectedReason: string;
  eventDate: string;
  eventName: string;
  activityType: 'TRAINING_ATTENDANCE' | 'PRESENTATION' | 'PUBLICATION' | 'TEACHING' | null;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
  } | null;
  user: {
    fullName: string | null;
    email: string;
  };
}

export async function getCeuHistory(): Promise<CeuHistoryItem[]> {
  const res = await api.get<CeuHistoryItem[]>('/ceu/history');
  return res.data;
}
