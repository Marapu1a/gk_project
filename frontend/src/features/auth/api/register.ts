// src/features/auth/api/register.ts
import { api } from '@/lib/axios';
import type { RegisterDto } from '../validation/registerSchema';

export async function registerUser(data: RegisterDto) {
  const { confirmPassword, ...requestData } = data;
  const response = await api.post('/auth/register', requestData);
  return response.data;
}
