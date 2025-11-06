// src/features/supervision/api/updateSupervisionHour.ts
import { api } from '@/lib/axios';

export type HourStatus = 'CONFIRMED' | 'REJECTED';

export interface UpdateHourStatusInput {
  id: string;
  status: HourStatus;
  rejectedReason?: string;
}

export interface UpdateSupervisionHourResponse {
  success: true;
  updated: {
    id: string;
    recordId: string;
    type?: 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' | 'INSTRUCTOR' | 'CURATOR'; // для единообразия
    value?: number;
    status: HourStatus;
    reviewedAt: string | null;
    rejectedReason: string | null;
    reviewerId: string | null;
  };
}

export async function updateSupervisionHour({
  id,
  status,
  rejectedReason,
}: UpdateHourStatusInput): Promise<UpdateSupervisionHourResponse> {
  const payload = {
    status,
    rejectedReason: status === 'REJECTED' ? rejectedReason?.trim() ?? '' : undefined,
  };

  const { data } = await api.patch<UpdateSupervisionHourResponse>(`/supervision/${id}`, payload);
  return data;
}
