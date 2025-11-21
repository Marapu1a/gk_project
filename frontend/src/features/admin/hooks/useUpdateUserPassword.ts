// src/features/admin/hooks/useUpdateUserPassword.ts
import { useMutation } from '@tanstack/react-query';
import {
  updateUserPassword,
  type UpdateUserPasswordBody,
  type UpdateUserPasswordResponse,
} from '../api/updateUserPassword';

export function useUpdateUserPassword(userId: string) {
  return useMutation<UpdateUserPasswordResponse, any, UpdateUserPasswordBody>({
    mutationFn: (data) => updateUserPassword(userId, data),
  });
}
