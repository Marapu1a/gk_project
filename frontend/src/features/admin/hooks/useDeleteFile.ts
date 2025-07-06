import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFile } from '../api/deleteFile';

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDetails'] });
    },
    onError: (error) => {
      console.error('Ошибка при удалении файла:', error);
    },
  });
}
