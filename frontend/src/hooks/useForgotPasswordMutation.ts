import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '@/api/auth';

export const useForgotPasswordMutation = () => {
  return useMutation({ mutationFn: forgotPassword });
};
