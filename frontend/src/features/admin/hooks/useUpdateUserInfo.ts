import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserInfo, type UpdateUserInfoPayload } from '../api/updateUserInfo';
import { adminUserDetailsQueryKey } from './useUserDetails';
import { adminUsersQueryKey } from './useUsers';

export function useUpdateUserInfo(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInfoPayload) => updateUserInfo(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
      qc.invalidateQueries({ queryKey: adminUsersQueryKey });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
