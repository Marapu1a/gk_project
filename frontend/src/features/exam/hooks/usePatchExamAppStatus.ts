import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchExamAppStatus } from '../api/patchExamAppStatus';
import type { ExamApp, ExamStatus } from '../api/getMyExamApp';
import { adminUserDetailsQueryKey } from '@/features/admin/hooks/useUserDetails';

export function usePatchExamAppStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (p: {
      userId: string;
      applicationId?: string;
      status: ExamStatus;
      comment?: string;
      notify?: boolean;
      manual?: boolean;
    }) =>
      patchExamAppStatus(p.userId, p.status, {
        applicationId: p.applicationId,
        comment: p.comment,
        notify: p.notify,
        manual: p.manual,
      }),
    onSuccess: (updated) => {
      // обновим кэш "me", если совпадает
      qc.setQueryData(['exam', 'me'], (prev: any) =>
        prev && prev.userId === updated.userId ? updated : prev
      );

      qc.setQueryData<ExamApp[]>(['exam', 'all'], (prev) =>
        prev?.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) ?? prev,
      );

      // Синхронизируем все места, где админ видит заявку на экзамен:
      // общий список /exam-applications и детали конкретного пользователя.
      qc.invalidateQueries({ queryKey: ['exam', 'all'] });
      qc.refetchQueries({ queryKey: ['exam', 'all'], type: 'active' });
      qc.invalidateQueries({ queryKey: ['exam', 'details', updated.userId] });
      qc.invalidateQueries({ queryKey: ['exam', 'details', updated.userId, updated.id] });
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(updated.userId) });
    },
  });
}
