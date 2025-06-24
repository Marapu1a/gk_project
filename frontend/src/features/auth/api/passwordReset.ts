import { api } from '@/lib/axios';

type ForgotPasswordRequest = {
  email: string;
};

type ResetPasswordRequest = {
  token: string;
  password: string;
};

export async function requestPasswordReset(data: ForgotPasswordRequest) {
  return api.post('/auth/forgot-password', data);
}

export async function resetPassword(data: ResetPasswordRequest) {
  return api.post('/auth/reset-password', data);
}
