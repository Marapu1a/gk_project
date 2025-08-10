import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFile } from '../api/deleteFile';

export function useDeleteFile(userId: string) {
  const qc = useQueryClient();
  const qk = ['admin', 'user', userId] as const;

  return useMutation({
    mutationFn: (uploadedFileId: string) => deleteFile(uploadedFileId), // DELETE /upload/:id
    onMutate: async (uploadedFileId) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<any>(qk);

      // оптимистично убираем файл из списка
      qc.setQueryData(qk, (old: any) =>
        old
          ? { ...old, uploadedFiles: old.uploadedFiles.filter((f: any) => f.id !== uploadedFileId) }
          : old
      );

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev); // откат
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk }); // финальный рефетч
    },
  });
}
