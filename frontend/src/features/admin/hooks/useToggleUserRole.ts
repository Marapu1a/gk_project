import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleUserRole } from '../api/toggleUserRole';

export function useToggleUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => toggleUserRole(userId),

    onSuccess: (updated: any, userId) => {
      // если бэк вернул обновлённого юзера — сразу патчим кэш (это НЕ оптимизм, уже после ответа)
      if (updated?.id && updated?.role) {
        qc.setQueriesData({ queryKey: ['admin', 'users'] }, (old: any) => {
          if (!old?.users) return old;
          return {
            ...old,
            users: old.users.map((u: any) => u.id === updated.id ? { ...u, role: updated.role } : u),
          };
        });
        qc.setQueryData(['admin', 'user', userId], (old: any) =>
          old ? { ...old, role: updated.role } : old
        );
      }

      // на всякий — точный рефетч
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },
  });
}
