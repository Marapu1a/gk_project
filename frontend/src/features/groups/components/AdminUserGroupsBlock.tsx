// src/features/admin/components/AdminUserGroupsBlock.tsx
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserGroupsById } from '@/features/groups/hooks/useUserGroupsById';
import { useUpdateUserGroups } from '@/features/groups/hooks/useUpdateUserGroups';
import { toast } from 'sonner';

import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import { useUpdateTargetLevel } from '@/features/admin/hooks/useUpdateTargetLevel';

import { targetLevelLabels } from '@/utils/labels';

export default function AdminUserGroupsBlock({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserGroupsById(userId, true);
  const mutation = useUpdateUserGroups(userId);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 300_000,
  });

  const { data: userDetails } = useUserDetails(userId);
  const updateTargetLevel = useUpdateTargetLevel(userId);

  const currentTarget = userDetails?.targetLevel ?? null;
  const [target, setTarget] = useState<string | null>(currentTarget);

  useEffect(() => setTarget(userDetails?.targetLevel ?? null), [userDetails]);

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

  const saveTarget = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    try {
      await updateTargetLevel.mutateAsync(target as any);
    } catch {
      toast.error('Ошибка обновления уровня');
    }
  };

  const activeGroup = data?.allGroups
    .filter((g) => selected.includes(g.id))
    .sort((a, b) => b.rank - a.rank)[0];

  const activeGroupName = activeGroup?.name ?? '—';
  const currentRank = activeGroup?.rank ?? 0; // ← теперь правильно

  // уровни повышения строго по rank (DB → единственно верный источник истины)
  const levelMap = { INSTRUCTOR: 2, CURATOR: 3, SUPERVISOR: 4 } as const;

  const availableLevels = Object.entries(levelMap)
    .filter(([, rank]) => rank > currentRank) // только выше текущего
    .map(([lvl]) => lvl);

  const isSupervisorAlready = availableLevels.length === 0; // достиг потолка

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
          {mutation.isPending ? 'Сохраняем…' : 'Сохранить группы'}
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
              Активная группа: <strong>{activeGroupName}</strong>
            </p>

            {currentUser?.role === 'ADMIN' && (
              <div className="mt-6 space-y-3">
                <div className="text-sm text-blue-dark">
                  Текущий целевой уровень:{' '}
                  <b>{targetLevelLabels[userDetails?.targetLevel ?? ''] ?? '— нет —'}</b>
                </div>

                {isSupervisorAlready ? (
                  <p className="text-xs italic text-blue-dark">
                    Пользователь уже на максимальном уровне — повышение недоступно.
                  </p>
                ) : (
                  <>
                    <label className="text-sm font-medium text-blue-dark block">
                      Назначить новый целевой уровень
                    </label>

                    <select
                      className="border rounded-lg p-2 w-full"
                      style={{ borderColor: 'var(--color-green-light)' }}
                      value={target ?? ''}
                      onChange={(e) => setTarget(e.target.value || null)}
                    >
                      <option value="">— выбрать уровень —</option>
                      {availableLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {targetLevelLabels[lvl]}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn btn-brand mt-2"
                      onClick={saveTarget}
                      disabled={updateTargetLevel.isPending}
                    >
                      {updateTargetLevel.isPending ? 'Сохраняем…' : 'Сохранить уровень'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
