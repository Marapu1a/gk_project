import { api } from '@/lib/axios';

export async function updateFile(id: string, type: string) {
  const response = await api.patch(`/upload/${id}`, { type });
  return response.data;
}
