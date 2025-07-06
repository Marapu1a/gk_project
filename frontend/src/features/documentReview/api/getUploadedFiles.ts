import { api } from '@/lib/axios';

export async function getUploadedFiles() {
  const res = await api.get('/uploads');
  return res.data;
}
