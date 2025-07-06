// features/ceu/api/getRecordsByEmail.ts
import { api } from '@/lib/axios';

export async function getRecordsByEmail(email: string, fromDate?: string, toDate?: string) {
  const response = await api.get(`/ceu/by-email`, {
    params: {
      email,
      fromDate,
      toDate,
    },
  });
  return response.data;
}
