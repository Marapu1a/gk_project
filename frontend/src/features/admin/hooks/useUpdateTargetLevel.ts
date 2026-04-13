import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTargetLevel } from '../api/updateTargetLevel';
import { toast } from 'sonner';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
type GoalMode = 'CERTIFICATION' | 'RENEWAL';

export function useUpdateTargetLevel(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { targetLevel: TargetLevel; goalMode?: GoalMode }) =>
      updateTargetLevel(userId, payload),

    onSuccess: async () => {
      toast.success('Р¦РµР»РµРІРѕР№ СѓСЂРѕРІРµРЅСЊ РѕР±РЅРѕРІР»С‘РЅ');

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'user', 'details', userId] }),
        qc.invalidateQueries({ queryKey: ['groups', 'user', userId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
        qc.invalidateQueries({ queryKey: ['payments', 'user', userId] }),
      ]);
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ targetLevel');
    },
  });
}
