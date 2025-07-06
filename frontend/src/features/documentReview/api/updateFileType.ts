import { api } from '@/lib/axios';

export async function updateFileType(fileId: string, type: string) {
  const res = await api.patch(`/upload/${fileId}`, { type });
  return res.data;
}
