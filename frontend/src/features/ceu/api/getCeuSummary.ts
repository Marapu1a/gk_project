// src/features/ceu/api/getCeuSummary.ts
import { api } from '@/lib/axios';

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

export async function getCeuSummary(): Promise<CeuSummaryResponse> {
  const response = await api.get('/ceu/summary');
  return response.data;
}
