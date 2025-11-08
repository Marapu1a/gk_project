// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

// enum цели
export type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

// обновляем структуру под новые названия категорий
export type SupervisionSummary = {
  practice: number;     // было instructor
  supervision: number;  // было curator
  supervisor: number;   // менторские
};

export interface SupervisionSummaryResponse {
  required: SupervisionSummary | null;
  percent: SupervisionSummary | null;
  usable: SupervisionSummary;
  pending?: SupervisionSummary;
  mentor?: {
    total: number;
    required: number;
    percent: number;
    pending: number;
  } | null;
}

export async function getSupervisionSummary(level?: Level | null): Promise<SupervisionSummaryResponse> {
  const params = level ? { level } : undefined;
  const { data } = await api.get<SupervisionSummaryResponse>('/supervision/summary', { params });
  return data;
}
