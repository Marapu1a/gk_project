// src/features/supervision/api/getSupervisionHistory.ts
import { api } from '@/lib/axios';

export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type PracticeLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

export type SupervisionHistoryItem = {
  id: string;
  recordId: string;
  fileId: string | null;
  type: PracticeLevel;
  value: number;
  status: RecordStatus;
  createdAt: string;                 // record.createdAt
  reviewedAt: string | null;
  rejectedReason: string | null;
  reviewer: { id: string; fullName: string; email: string } | null;
};

export type GetSupervisionHistoryResponse = {
  items: SupervisionHistoryItem[];
  nextCursor: string | null;
};

export type GetSupervisionHistoryParams = {
  status?: RecordStatus;   // опционально
  take?: number;           // 1..100
  cursor?: string | null;  // пагинация по hour.id
};

export async function getSupervisionHistory(
  params: GetSupervisionHistoryParams = {}
): Promise<GetSupervisionHistoryResponse> {
  const { data } = await api.get<GetSupervisionHistoryResponse>('/supervision/history', {
    params,
  });
  return data;
}
