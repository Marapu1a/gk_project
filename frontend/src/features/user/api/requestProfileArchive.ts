import { api } from '@/lib/axios';

export async function requestProfileArchive(reason?: string): Promise<void> {
  await api.post('/users/me/archive-request', { reason });
}
