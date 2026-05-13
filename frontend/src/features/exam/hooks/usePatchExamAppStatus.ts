import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchExamAppStatus } from '../api/patchExamAppStatus';
import type { ExamStatus } from '../api/getMyExamApp';

export function usePatchExamAppStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (p: {
      userId: string;
      status: ExamStatus;
      comment?: string;
      notify?: boolean;
      manual?: boolean;
    }) =>
      patchExamAppStatus(p.userId, p.status, {
        comment: p.comment,
        notify: p.notify,
        manual: p.manual,
      }),
    onSuccess: (updated) => {
      // обновим кэш "me", если совпадает
      qc.setQueryData(['exam', 'me'], (prev: any) =>
        prev && prev.userId === updated.userId ? updated : prev
      );
      // Синхронизируем все места, где админ видит заявку на экзамен:
      // общий список /exam-applications и детали конкретного пользователя.
      qc.invalidateQueries({ queryKey: ['exam', 'all'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', updated.userId] });
    },
  });
}
