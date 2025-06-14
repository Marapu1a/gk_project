// src/features/ceu/api/getCeuList.ts
import { api } from '@/lib/axios';

export interface CeuEntry {
  category: 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
}

export interface CeuRecord {
  id: string;
  eventName: string;
  entries: CeuEntry[];
}

export interface CeuListResponse {
  records: CeuRecord[];
}

export async function getCeuList(): Promise<CeuListResponse> {
  const response = await api.get('/ceu/list');
  return response.data;
}
