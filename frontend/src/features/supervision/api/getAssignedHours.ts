// src/features/supervision/api/getAssignedHours.ts
import { api } from '@/lib/axios';

export type RecordStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
export type PracticeLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

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
  status?: RecordStatus; // по умолчанию UNCONFIRMED
  take?: number;         // 1..100, по умолчанию 25
  cursor?: string | null;
};

export async function getAssignedHours(
  params: GetAssignedHoursParams = {}
): Promise<GetAssignedHoursResponse> {
  const { status = 'UNCONFIRMED', take = 25, cursor } = params;

  const { data } = await api.get<GetAssignedHoursResponse>('/supervision/review', {
    params: { status, take, cursor },
  });

  return data;
}
