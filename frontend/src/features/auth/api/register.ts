// src/features/auth/api/register.ts
import { api } from '@/lib/axios';
import type { RegisterDto } from '../validation/registerSchema';

export async function registerUser(data: RegisterDto) {
  const response = await api.post('/auth/register', data);
  return response.data;
}
