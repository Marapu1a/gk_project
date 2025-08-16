// src/features/supervision/api/getSupervisionList.ts
import { api } from '@/lib/axios';

export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type PracticeLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

export type SupervisionHourItem = {
  id: string;
  type: PracticeLevel;
  value: number;
  status: RecordStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
};

export type SupervisionRecordItem = {
  id: string;
  createdAt: string;
  hours: SupervisionHourItem[];
};

export type GetSupervisionListResponse = {
  records: SupervisionRecordItem[];
  nextCursor: string | null;
};

export type GetSupervisionListParams = {
  status?: RecordStatus; // опционально фильтруем записи и часы внутри
  take?: number;         // 1..100 (дефолт бэка ~20)
  cursor?: string | null;
};

export async function getSupervisionList(
  params: GetSupervisionListParams = {}
): Promise<GetSupervisionListResponse> {
  const { status, take, cursor } = params;

  const { data } = await api.get<GetSupervisionListResponse>('/supervision/list', {
    params: { status, take, cursor },
  });

  return data;
}
