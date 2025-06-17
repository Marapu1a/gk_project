// features/ceu/api/updateEntry.ts
import { api } from '@/lib/axios';

export async function updateCEUEntry(id: string, payload: { status: 'CONFIRMED' | 'REJECTED' | 'UNCONFIRMED'; rejectedReason?: string }) {
  const response = await api.patch(`/ceu/entry/${id}`, payload);
  return response.data;
}
