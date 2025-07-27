import { useMutation } from '@tanstack/react-query';
import { updateFileType } from '../api/updateFileType';

export function useUpdateFileType() {
  return useMutation({
    mutationFn: ({ fileId, type }: { fileId: string; type: string }) =>
      updateFileType(fileId, type),
  });
}
