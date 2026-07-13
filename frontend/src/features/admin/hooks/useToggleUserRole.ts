import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleUserRole } from '../api/toggleUserRole';
import { adminUserDetailsQueryKey } from './useUserDetails';
import { adminUsersQueryKey } from './useUsers';

export function useToggleUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => toggleUserRole(userId),

    onSuccess: (updated: any, userId) => {
      // если бэк вернул обновлённого юзера — сразу патчим кэш (это НЕ оптимизм, уже после ответа)
      if (updated?.id && updated?.role) {
        qc.setQueriesData({ queryKey: adminUsersQueryKey }, (old: any) => {
          if (!old?.users) return old;
          return {
            ...old,
            users: old.users.map((u: any) => u.id === updated.id ? { ...u, role: updated.role } : u),
          };
        });
        qc.setQueryData(adminUserDetailsQueryKey(userId), (old: any) =>
          old ? { ...old, role: updated.role } : old
        );
      }

      // на всякий — точный рефетч
      qc.invalidateQueries({ queryKey: adminUsersQueryKey });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: adminUserDetailsQueryKey(userId) });
    },
  });
}
