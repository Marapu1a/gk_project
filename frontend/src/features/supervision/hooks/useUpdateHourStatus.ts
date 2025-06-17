import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSupervisionHour } from '../api/updateSupervisionHour';

export function useUpdateHourStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSupervisionHour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', 'supervision'] });
    },
  });
}
