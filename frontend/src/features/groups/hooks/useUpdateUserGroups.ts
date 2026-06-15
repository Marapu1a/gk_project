// src/features/groups/hooks/useUpdateUserGroups.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserGroups, type UpdateUserGroupsResponse } from '../api/updateUserGroups';
import { toast } from 'sonner';
import { examStatusLabels, paymentStatusLabels } from '@/utils/labels';
import { getUiErrorMessage } from '@/utils/uiMessages';

const label = (map: Record<string, string>, code?: string | null) =>
  code ? (map[code] ?? code) : '';

export function useUpdateUserGroups(userId: string, isSelf = false) {
  const qc = useQueryClient();

  return useMutation<UpdateUserGroupsResponse, any, string[]>({
    mutationFn: (groupIds) => updateUserGroups(userId, groupIds),

    onSuccess: async (data) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['groups', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['admin-ceu-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'supervision-matrix', userId] }),
        qc.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'ceu-history'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'supervision', 'reviewerCandidates'] }),
        qc.invalidateQueries({ queryKey: ['exam', 'all'] }),
      ]);

      if (isSelf) {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['current-user'] }),
          qc.invalidateQueries({ queryKey: ['ceuSummary'] }),
          qc.invalidateQueries({ queryKey: ['ceu', 'summary'] }),
          qc.invalidateQueries({ queryKey: ['ceu', 'history'] }),
          qc.invalidateQueries({ queryKey: ['supervisionSummary'] }),
          qc.invalidateQueries({ queryKey: ['supervision', 'summary'] }),
          qc.invalidateQueries({ queryKey: ['exam', 'me'] }),
        ]);
      }

      if (data.groupsChanged) {
        toast.success(
          data.closedCycleCount
            ? 'Уровень сертификации обновлен, текущий цикл закрыт.'
            : 'Уровень сертификации пользователя обновлен.',
        );
      } else if (data.upgraded) {
        const burned = typeof data.burned === 'number' ? data.burned : 0;
        toast.success(`Повышение применено. Списано CEU: ${burned}.`);

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
        toast.success('Уровень сертификации пользователя сохранен.');
      }
    },

    onError: (err: any) => {
      toast.error(getUiErrorMessage(err, 'Не удалось обновить уровень сертификации.'));
    },
  });
}
