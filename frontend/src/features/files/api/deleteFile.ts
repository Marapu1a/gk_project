import { api } from '@/lib/axios';

export async function deleteFile(id: string) {
  const response = await api.delete(`/upload/${id}`);
  return response.data;
}
