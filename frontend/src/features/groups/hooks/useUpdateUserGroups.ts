// src/features/groups/hooks/useUpdateUserGroups.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserGroups, type UpdateUserGroupsResponse } from '../api/updateUserGroups';
import { toast } from 'sonner';
import { examStatusLabels, paymentStatusLabels } from '@/utils/labels';

const label = (map: Record<string, string>, code?: string | null) =>
  code ? (map[code] ?? code) : '';

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

        // читаем коды из возможных полей ответа и мапим в человекочитаемые
        const d: any = data;
        if (data.examReset) {
          const code = d.examStatusAfter ?? d.examStatus ?? null;
          const text = label(examStatusLabels, code);
          toast.info(`Заявка на экзамен сброшена${text ? ` до ${text}` : ''}.`);
        }

        if (data.examPaymentReset) {
          const code = d.paymentStatusAfter ?? d.paymentStatus ?? null;
          const text = label(paymentStatusLabels, code);
          const cnt =
            typeof d.examPaymentResetCount === 'number'
              ? ` (${d.examPaymentResetCount})`
              : '';
          toast.info(`Оплата экзамена сброшена${text ? ` до ${text}` : ''}${cnt}.`);
        }
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
