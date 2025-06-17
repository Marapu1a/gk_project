import { api } from '@/lib/axios';

type UpdateHourStatusInput = {
  id: string;
  status: 'CONFIRMED' | 'REJECTED';
  rejectedReason?: string;
};

export async function updateSupervisionHour({ id, status, rejectedReason }: UpdateHourStatusInput) {
  const response = await api.patch(`/supervision/${id}`, {
    status,
    rejectedReason,
  });
  return response.data;
}
