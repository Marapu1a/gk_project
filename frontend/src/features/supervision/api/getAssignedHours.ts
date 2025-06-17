import { api } from '@/lib/axios';

export async function getAssignedHours() {
  const response = await api.get('/supervision/review');
  return response.data;
}
