import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchExamAppStatus } from '../api/patchExamAppStatus';
import type { ExamStatus } from '../api/getMyExamApp';

export function usePatchExamAppStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (p: { userId: string; status: ExamStatus; comment?: string; notify?: boolean }) =>
      patchExamAppStatus(p.userId, p.status, { comment: p.comment, notify: p.notify }),
    onSuccess: (updated) => {
      // обновим кэш "me", если совпадает
      qc.setQueryData(['exam', 'me'], (prev: any) =>
        prev && prev.userId === updated.userId ? updated : prev
      );
      // и просто инвалиднём список админа
      qc.invalidateQueries({ queryKey: ['exam', 'all'] });
    },
  });
}
