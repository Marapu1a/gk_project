import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserNote } from '../api/createUserNote';

export function useCreateUserNote(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => createUserNote(userId, text),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'action-log', userId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
      ]);
    },
  });
}
