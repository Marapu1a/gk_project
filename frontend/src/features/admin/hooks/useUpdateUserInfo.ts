import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserInfo, type UpdateUserInfoPayload } from '../api/updateUserInfo';

export function useUpdateUserInfo(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInfoPayload) => updateUserInfo(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
