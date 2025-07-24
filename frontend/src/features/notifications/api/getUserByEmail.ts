// src/features/notifications/api/getUserByEmail.ts
import { api } from '@/lib/axios';

export async function getUserByEmail(email: string) {
  const response = await api.get('/moderators/user-by-email', {
    params: { email },
  });
  return response.data; // { id, email, fullName }
}
