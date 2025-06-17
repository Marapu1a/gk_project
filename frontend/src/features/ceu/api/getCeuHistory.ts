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
}

export async function getCeuHistory(): Promise<CeuHistoryItem[]> {
  const res = await api.get<CeuHistoryItem[]>('/ceu/history');
  return res.data;
}
