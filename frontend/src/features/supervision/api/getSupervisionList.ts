// src/features/supervision/api/getSupervisionList.ts
import { api } from '@/lib/axios';

export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';

// новые + legacy
export type PracticeLevel =
  | 'PRACTICE'
  | 'SUPERVISION'
  | 'SUPERVISOR'
  | 'INSTRUCTOR'
  | 'CURATOR';

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
  status?: RecordStatus;
  take?: number;
  cursor?: string | null;
};

// нормализация типов (INSTRUCTOR→PRACTICE, CURATOR→SUPERVISION)
function normalizeType(t: PracticeLevel): PracticeLevel {
  if (t === 'INSTRUCTOR') return 'PRACTICE';
  if (t === 'CURATOR') return 'SUPERVISION';
  return t;
}

export async function getSupervisionList(
  params: GetSupervisionListParams = {}
): Promise<GetSupervisionListResponse> {
  const { status, take, cursor } = params;
  const { data } = await api.get<GetSupervisionListResponse>('/supervision/list', {
    params: { status, take, cursor },
  });

  return {
    ...data,
    records: data.records.map((r) => ({
      ...r,
      hours: r.hours.map((h) => ({ ...h, type: normalizeType(h.type) })),
    })),
  };
}
