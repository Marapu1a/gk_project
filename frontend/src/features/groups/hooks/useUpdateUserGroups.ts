// src/features/groups/hooks/useUpdateUserGroups.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserGroups, type UpdateUserGroupsResponse } from '../api/updateUserGroups';
import { toast } from 'sonner';

export function useUpdateUserGroups(userId: string, isSelf = false) {
  const qc = useQueryClient();

  return useMutation<UpdateUserGroupsResponse, any, string[]>({
    mutationFn: (groupIds) => updateUserGroups(userId, groupIds),
    onSuccess: (data) => {
      // Пользователь/группы
      qc.invalidateQueries({ queryKey: ['groups', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });

      // CEU (если меняем себе)
      if (isSelf) {
        qc.invalidateQueries({ queryKey: ['current-user'] });
        qc.invalidateQueries({ queryKey: ['ceu', 'summary'] });
        qc.invalidateQueries({ queryKey: ['ceu', 'history'] });
      }

      // Экзам. заявки
      qc.invalidateQueries({ queryKey: ['exam', 'all'] });
      if (isSelf) qc.invalidateQueries({ queryKey: ['exam', 'me'] });

      // Платежи (экзамен)
      qc.invalidateQueries({ queryKey: ['payments', 'user', userId] });

      if (data.upgraded) {
        toast.success(`Повышение применено. Списано CEU: ${data.burned}.`);
        if (data.examReset) toast.info('Заявка на экзамен сброшена до NOT_SUBMITTED.');
        if (data.examPaymentReset)
          toast.info(`Оплата EXAM_ACCESS сброшена до UNPAID (${data.examPaymentResetCount}).`);
      } else {
        toast.success('Группы обновлены.');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Не удалось обновить группы';
      toast.error(msg);
    },
  });
}
