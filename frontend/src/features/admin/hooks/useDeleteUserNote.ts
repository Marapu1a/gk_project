import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUserNote } from '../api/deleteUserNote';

export function useDeleteUserNote(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteUserNote(userId, noteId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
      ]);
    },
  });
}
