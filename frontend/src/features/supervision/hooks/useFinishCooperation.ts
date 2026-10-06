import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useFinishCooperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (relationId: string) => {
      const { data } = await api.post<{ cancelledHours: number }>(`/supervision/cooperations/${relationId}/finish`);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supervision'] }),
        queryClient.invalidateQueries({ queryKey: ['review'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'supervision'] }),
      ]);
    },
  });
}
