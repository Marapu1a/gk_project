import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFileType } from '../api/updateFileType';

export function useUpdateFileType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, type }: { fileId: string; type: string }) =>
      updateFileType(fileId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
    },
  });
}
