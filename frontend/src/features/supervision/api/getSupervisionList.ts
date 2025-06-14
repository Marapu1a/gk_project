// src/features/supervision/api/getSupervisionList.ts
import { api } from '@/lib/axios';

export interface SupervisionHour {
  type: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
  value: number;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
}

export interface SupervisionRecord {
  id: string;
  hours: SupervisionHour[];
}

export interface SupervisionListResponse {
  records: SupervisionRecord[];
}

export async function getSupervisionList(): Promise<SupervisionListResponse> {
  const response = await api.get('/supervision/list');
  return response.data;
}
