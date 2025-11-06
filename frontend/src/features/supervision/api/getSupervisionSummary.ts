// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

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
  pending?: SupervisionSummary; // бэкенд теперь возвращает
  mentor?: {
    total: number;
    required: number;
    percent: number;
    pending: number;
  } | null;
}

export async function getSupervisionSummary(): Promise<SupervisionSummaryResponse> {
  const { data } = await api.get<SupervisionSummaryResponse>('/supervision/summary');
  return data;
}
