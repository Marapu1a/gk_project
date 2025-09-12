import { useMutation } from '@tanstack/react-query';
import { deleteUser } from '../api/deleteUser';

export function useDeleteUser() {
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
  });
}
