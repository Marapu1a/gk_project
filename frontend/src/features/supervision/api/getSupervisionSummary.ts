// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

export type SupervisionSummary = {
  instructor: number;
  curator: number;
  supervisor: number;
};

export interface SupervisionSummaryResponse {
  required: SupervisionSummary | null;
  percent: SupervisionSummary | null;
  usable: SupervisionSummary;
}

export async function getSupervisionSummary(): Promise<SupervisionSummaryResponse> {
  const res = await api.get('/supervision/summary');
  return res.data;
}
