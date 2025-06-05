import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '@/api/auth';
import type { ResetPasswordFormData } from '@/validators/auth';

export const useResetPasswordMutation = (token: string) =>
  useMutation({
    mutationFn: (data: ResetPasswordFormData) => resetPassword({ ...data, token }),
  });
