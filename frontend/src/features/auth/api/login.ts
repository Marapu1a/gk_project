// src/features/auth/api/login.ts
import { api } from '@/lib/axios';
import type { LoginDto } from '../validation/loginSchema';

export async function loginUser(data: LoginDto) {
  const response = await api.post('/auth/login', data);
  return response.data;
}
