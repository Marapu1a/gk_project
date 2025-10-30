// src/features/admin/components/AdminUserGroupsBlock.tsx
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserGroupsById } from '@/features/groups/hooks/useUserGroupsById';
import { useUpdateUserGroups } from '@/features/groups/hooks/useUpdateUserGroups';
import { toast } from 'sonner';

export default function AdminUserGroupsBlock({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserGroupsById(userId, true);
  const mutation = useUpdateUserGroups(userId);
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 300_000,
  });

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (data) setSelected(data.currentGroupIds);
  }, [data]);

  const maxRank = currentUser?.role === 'ADMIN' ? Infinity : (currentUser?.activeGroup?.rank ?? 0);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    const ok = await new Promise<boolean>((resolve) =>
      toast('Сохранить изменения групп пользователя?', {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      }),
    );
    if (!ok) return;
    try {
      await mutation.mutateAsync(selected);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const activeGroupName = (() => {
    if (!data) return '—';
    const selectedGroups = data.allGroups
      .filter((g) => selected.includes(g.id))
      .sort((a, b) => b.rank - a.rank);
    return selectedGroups[0]?.name ?? '—';
  })();

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">Группы пользователя</h2>
        <button className="btn btn-brand" onClick={save} disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {isLoading && <p className="text-sm text-blue-dark">Загрузка…</p>}
        {error && <p className="text-error">Ошибка загрузки</p>}
        {data && (
          <>
            <div className="text-sm text-blue-dark">
              <p>
                <strong>Имя:</strong> {data.user.fullName}
              </p>
              <p>
                <strong>Email:</strong> {data.user.email}
              </p>
            </div>

            <div
              className="overflow-x-auto rounded-2xl border"
              style={{ borderColor: 'var(--color-green-light)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                    <th className="p-3 text-left">Группа</th>
                    <th className="p-3 text-center">Входит</th>
                    <th className="p-3 text-center">Разрешено?</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allGroups.map((g) => {
                    const checked = selected.includes(g.id);
                    const disabled = g.rank > maxRank;
                    return (
                      <tr
                        key={g.id}
                        className="border-t hover:bg-gray-50"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <td className="p-3">{g.name}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(g.id)}
                            disabled={disabled || mutation.isPending}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {disabled ? (
                            <span className="text-error text-xs italic">Недостаточно прав</span>
                          ) : (
                            <span className="text-green-700">✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm italic">
              Текущая активная группа: <strong>{activeGroupName}</strong>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
