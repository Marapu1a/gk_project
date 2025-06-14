// src/features/ceu/api/getCeuSummary.ts
import { api } from '@/lib/axios';

export interface CeuSummaryResponse {
  required: {
    ethics: number;
    cultDiver: number;
    supervision: number;
    general: number;
  } | null;
  percent: {
    ethics: number;
    cultDiver: number;
    supervision: number;
    general: number;
  } | null;
  usable: {
    ethics: number;
    cultDiver: number;
    supervision: number;
    general: number;
  };
}

export async function getCeuSummary(): Promise<CeuSummaryResponse> {
  const response = await api.get('/ceu/summary');

  return response.data;
}
