// src/features/ceu/api/getCeuSummary.ts
import { api } from '@/lib/axios';

export type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

export interface CeuCategorySum {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
}

export interface CeuSummaryResponse {
  required: CeuCategorySum | null;
  percent: CeuCategorySum | null;
  usable: CeuCategorySum; // только CONFIRMED
  spent: CeuCategorySum;  // SPENT
  total: CeuCategorySum;  // usable + spent
}

export async function getCeuSummary(level?: Level | null): Promise<CeuSummaryResponse> {
  const params = level ? { level } : undefined;
  const { data } = await api.get('/ceu/summary', { params });
  return data;
}
