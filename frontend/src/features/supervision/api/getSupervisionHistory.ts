// src/features/supervision/api/getSupervisionHistory.ts
import { api } from '@/lib/axios';

export interface SupervisionHourEntry {
  id: string;
  type: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
  reviewedAt?: string;
  reviewerName?: string;
  rejectedReason?: string;
  createdAt: string;
}

export async function getSupervisionHistory(): Promise<SupervisionHourEntry[]> {
  const res = await api.get('/supervision/history');
  return res.data;
}
