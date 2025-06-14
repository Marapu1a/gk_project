import { api } from '@/lib/axios';

export async function fetchCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}
