// src/features/admin/components/AdminUserGroupsBlock.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useUserGroupsById } from '@/features/groups/hooks/useUserGroupsById';
import { useUpdateUserGroups } from '@/features/groups/hooks/useUpdateUserGroups';
import { useAbandonActiveCycle } from '@/features/admin/hooks/useAbandonActiveCycle';
import { toast } from 'sonner';

import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import { useUpdateTargetLevel } from '@/features/admin/hooks/useUpdateTargetLevel';

import { targetLevelLabels } from '@/utils/labels';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

const LEVEL_RANK_MAP: Record<TargetLevel, number> = {
  INSTRUCTOR: 2,
  CURATOR: 3,
  SUPERVISOR: 4,
};

function resolveCurrentLevelByGroupName(groupName: string | null | undefined): TargetLevel | null {
  if (groupName === 'Инструктор') return 'INSTRUCTOR';
  if (groupName === 'Куратор') return 'CURATOR';
  if (groupName === 'Супервизор' || groupName === 'Опытный Супервизор') return 'SUPERVISOR';
  return null;
}

function isCertificateActive(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

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
  const abandonCycle = useAbandonActiveCycle(userId);

  const [abandonReason, setAbandonReason] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setTarget(userDetails?.targetLevel ?? null);
  }, [userDetails?.targetLevel]);

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
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.response?.data?.error || 'Ошибка обновления уровня',
      );
    }
  };

  const handleAbandonCycle = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    const reason = abandonReason.trim();
    if (!reason) {
      toast.error('Укажите причину отмены цикла');
      return;
    }

    try {
      await abandonCycle.mutateAsync(reason);
      setAbandonReason('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Ошибка отмены цикла');
    }
  };

  const hasTarget = !!userDetails?.targetLevel;

  const activeGroup = data?.allGroups
    .filter((g) => selected.includes(g.id))
    .sort((a, b) => b.rank - a.rank)[0];

  const activeGroupName = activeGroup?.name ?? '—';
  const currentRank = activeGroup?.rank ?? 0;
  const currentLevel = resolveCurrentLevelByGroupName(activeGroup?.name);
  const hasActiveCertificate = (userDetails?.certificates ?? []).some((c) =>
    isCertificateActive(c.expiresAt),
  );

  const availableLevels = useMemo(() => {
    const result: TargetLevel[] = [];

    for (const [level, rank] of Object.entries(LEVEL_RANK_MAP) as [TargetLevel, number][]) {
      if (rank > currentRank) {
        result.push(level);
      }
    }

    if (hasActiveCertificate && currentLevel && !result.includes(currentLevel)) {
      result.unshift(currentLevel);
    }

    return result;
  }, [currentRank, currentLevel, hasActiveCertificate]);

  const hasOnlyRenewalOption =
    availableLevels.length === 1 && currentLevel !== null && availableLevels[0] === currentLevel;

  const noAvailableTargetOptions = availableLevels.length === 0;

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

                <div className="text-sm text-blue-dark">
                  Активный сертификат: <b>{hasActiveCertificate ? 'есть' : 'нет'}</b>
                </div>

                {noAvailableTargetOptions ? (
                  <p className="text-xs italic text-blue-dark">
                    Для этого пользователя сейчас нет доступных целей: нет уровней выше текущего и
                    нет активного сертификата для ресертификации.
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
                          {lvl === currentLevel && hasActiveCertificate ? ' (ресертификация)' : ''}
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

                    {hasOnlyRenewalOption && (
                      <p className="text-xs italic text-blue-dark">
                        Для этого пользователя доступна ресертификация текущего уровня.
                      </p>
                    )}

                    {hasTarget && (
                      <div
                        className="mt-6 p-4 rounded-xl border space-y-3"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <div className="text-sm font-medium text-blue-dark">
                          Отмена активного цикла
                        </div>

                        <textarea
                          className="border rounded-lg p-2 w-full min-h-[90px]"
                          style={{ borderColor: 'var(--color-green-light)' }}
                          placeholder="Причина отмены цикла"
                          value={abandonReason}
                          onChange={(e) => setAbandonReason(e.target.value)}
                          disabled={abandonCycle.isPending}
                        />

                        <button
                          type="button"
                          className="btn btn-brand mt-2"
                          onClick={handleAbandonCycle}
                          disabled={abandonCycle.isPending}
                        >
                          {abandonCycle.isPending ? 'Отменяем…' : 'Отменить активный цикл'}
                        </button>
                      </div>
                    )}
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
