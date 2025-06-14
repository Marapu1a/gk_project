// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

export interface SupervisionSummaryResponse {
  required: {
    instructor: number;
    curator: number;
    supervisor: number;
  } | null;
  percent: {
    instructor: number;
    curator: number;
    supervisor: number;
  } | null;
  usable: {
    instructor: number;
    curator: number;
    supervisor: number;
  };
}

export async function getSupervisionSummary(): Promise<SupervisionSummaryResponse> {
  const response = await api.get('/supervision/summary');
  return response.data;
}
