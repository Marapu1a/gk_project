import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleUserRole } from '../api/toggleUserRole';

export function useToggleUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
