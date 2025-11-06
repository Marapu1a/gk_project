// src/features/supervision/api/getAssignedHours.ts
import { api } from '@/lib/axios';

export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';

// Расширенный тип: новые + legacy
export type PracticeLevel =
  | 'PRACTICE'
  | 'SUPERVISION'
  | 'SUPERVISOR'
  | 'INSTRUCTOR'
  | 'CURATOR';

export type AssignedHourItem = {
  id: string;
  type: PracticeLevel;
  value: number;
  status: RecordStatus;
  reviewedAt: string | null;
  rejectedReason: string | null;
  record: {
    id: string;
    createdAt: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  };
};

export type GetAssignedHoursResponse = {
  hours: AssignedHourItem[];
  nextCursor: string | null;
};

export type GetAssignedHoursParams = {
  status?: RecordStatus;
  take?: number;
  cursor?: string | null;
};

// нормализатор
function normalizeType(t: PracticeLevel): PracticeLevel {
  if (t === 'INSTRUCTOR') return 'PRACTICE';
  if (t === 'CURATOR') return 'SUPERVISION';
  return t;
}

export async function getAssignedHours(
  params: GetAssignedHoursParams = {}
): Promise<GetAssignedHoursResponse> {
  const { status = 'UNCONFIRMED', take = 25, cursor } = params;

  const { data } = await api.get<GetAssignedHoursResponse>('/supervision/review', {
    params: { status, take, cursor },
  });

  // нормализуем типы сразу
  const hours = data.hours.map((h) => ({ ...h, type: normalizeType(h.type) }));

  return { ...data, hours };
}
