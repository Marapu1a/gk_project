import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUserNote } from '../api/deleteUserNote';
import { adminUserDetailsQueryKey } from './useUserDetails';

export function useDeleteUserNote(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteUserNote(userId, noteId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
        queryClient.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) }),
      ]);
    },
  });
}
