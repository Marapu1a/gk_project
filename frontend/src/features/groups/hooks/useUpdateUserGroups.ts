// src/features/groups/hooks/useUpdateUserGroups.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserGroups } from '../api/updateUserGroups';

export function useUpdateUserGroups(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupIds: string[]) => updateUserGroups(userId, groupIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'user', userId] });
    },
  });
}

