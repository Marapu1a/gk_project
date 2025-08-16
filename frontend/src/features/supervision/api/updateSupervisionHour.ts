// src/features/supervision/api/updateSupervisionHour.ts
import { api } from '@/lib/axios';

export type HourStatus = 'CONFIRMED' | 'REJECTED';

export type UpdateHourStatusInput = {
  id: string;
  status: HourStatus;
  rejectedReason?: string;
};

export type UpdateSupervisionHourResponse = {
  success: true;
  updated: {
    id: string;
    recordId: string;
    status: HourStatus;
    reviewedAt: string | null;
    rejectedReason: string | null;
    reviewerId: string | null;
  };
};

export async function updateSupervisionHour(
  { id, status, rejectedReason }: UpdateHourStatusInput
): Promise<UpdateSupervisionHourResponse> {
  const { data } = await api.patch<UpdateSupervisionHourResponse>(`/supervision/${id}`, {
    status,
    rejectedReason,
  });
  return data;
}
