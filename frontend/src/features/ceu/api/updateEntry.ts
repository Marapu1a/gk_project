// features/ceu/api/updateEntry.ts
import { api } from '@/lib/axios';

export type UpdateCEUEntryPayload = {
  status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED';
  rejectedReason?: string;
  deleteFile?: boolean;
  notifyUser?: boolean;
  notify?: boolean;
};

export async function updateCEUEntry(id: string, payload: UpdateCEUEntryPayload) {
  const response = await api.patch(`/ceu/entry/${id}`, payload);
  return response.data;
}

export async function deleteCEURecord(recordId: string) {
  const response = await api.delete(`/admin/ceu/records/${recordId}`);
  return response.data;
}
