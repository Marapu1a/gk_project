import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserVisibility } from '../api/updateUserVisibility';

export function useUpdateUserVisibility(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (isProfileVisible: boolean) => updateUserVisibility(userId, isProfileVisible),
    onSuccess: (_, isProfileVisible) => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['registry'] });

      if (isProfileVisible) {
        qc.invalidateQueries({ queryKey: ['registry-profile', userId] });
      }
    },
  });
}
