import { api } from '@/lib/axios';

export async function deleteFile(fileId: string) {
  const res = await api.delete(`/upload/${fileId}`);
  return res.data;
}
