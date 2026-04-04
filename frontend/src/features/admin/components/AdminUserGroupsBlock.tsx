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

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

function isCertificateActive(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

function getCertificateStatusText(expiresAt: string | null) {
  if (!expiresAt) return 'без срока окончания';
  return isCertificateActive(expiresAt) ? 'действует' : 'просрочен';
}

function getCycleTypeLabel(type: 'CERTIFICATION' | 'RENEWAL' | null | undefined) {
  if (type === 'RENEWAL') return 'ресертификация';
  if (type === 'CERTIFICATION') return 'сертификация';
  return '—';
}

function getDisplayedLevelLabel(
  level: TargetLevel | null | undefined,
  activeGroupName: string | null | undefined,
  mode?: 'CERTIFICATION' | 'RENEWAL' | null,
) {
  if (!level) return '—';

  if (level === 'SUPERVISOR' && mode === 'RENEWAL' && activeGroupName === 'Опытный Супервизор') {
    return 'Опытный супервизор';
  }

  return targetLevelLabels[level] ?? level;
}

type ActionOption = {
  level: TargetLevel;
  mode: 'CERTIFICATION' | 'RENEWAL';
  label: string;
};

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
      toast.success('Группы обновлены');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const saveTarget = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;

    try {
      await updateTargetLevel.mutateAsync(target as any);
      toast.success('Цель обновлена');
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
      toast.success('Активный цикл отменён');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Ошибка отмены цикла');
    }
  };

  const activeGroup = data?.allGroups
    .filter((g) => selected.includes(g.id))
    .sort((a, b) => b.rank - a.rank)[0];

  const activeGroupName = activeGroup?.name ?? '—';
  const currentRank = activeGroup?.rank ?? 0;
  const currentLevel = resolveCurrentLevelByGroupName(activeGroup?.name);

  const activeCycle = userDetails?.activeCycle ?? null;
  const latestCertificate = userDetails?.latestCertificate ?? null;
  const hasActiveCertificate =
    !!latestCertificate && isCertificateActive(latestCertificate.expiresAt);

  const currentTargetLabel = getDisplayedLevelLabel(
    userDetails?.targetLevel ?? null,
    activeGroup?.name ?? null,
    activeCycle?.type ?? null,
  );

  const cycleTargetLabel = getDisplayedLevelLabel(
    activeCycle?.targetLevel ?? null,
    activeGroup?.name ?? null,
    activeCycle?.type ?? null,
  );

  const latestCertificateLabel =
    latestCertificate?.group?.name === 'Опытный Супервизор'
      ? 'Опытный супервизор'
      : (latestCertificate?.group?.name ?? '—');

  const availableActions = useMemo<ActionOption[]>(() => {
    const result: ActionOption[] = [];

    for (const [level, rank] of Object.entries(LEVEL_RANK_MAP) as [TargetLevel, number][]) {
      if (rank > currentRank) {
        result.push({
          level,
          mode: 'CERTIFICATION',
          label: `Повышение до уровня «${targetLevelLabels[level]}»`,
        });
      }
    }

    if (hasActiveCertificate && currentLevel) {
      const renewalLabel =
        currentLevel === 'SUPERVISOR' && activeGroup?.name === 'Опытный Супервизор'
          ? 'Ресертификация уровня «Опытный супервизор»'
          : `Ресертификация уровня «${targetLevelLabels[currentLevel]}»`;

      if (!result.some((item) => item.level === currentLevel && item.mode === 'RENEWAL')) {
        result.unshift({
          level: currentLevel,
          mode: 'RENEWAL',
          label: renewalLabel,
        });
      }
    }

    return result;
  }, [currentRank, currentLevel, hasActiveCertificate, activeGroup?.name]);

  const noAvailableTargetOptions = availableActions.length === 0;

  const selectedAction = useMemo<{
    level: TargetLevel;
    mode: 'CERTIFICATION' | 'RENEWAL';
  } | null>(() => {
    if (!target) return null;

    const selectedLevel = target as TargetLevel;
    const isRenewal =
      activeCycle?.type === 'RENEWAL'
        ? activeCycle.targetLevel === selectedLevel
        : hasActiveCertificate && currentLevel === selectedLevel;

    return {
      level: selectedLevel,
      mode: isRenewal ? 'RENEWAL' : 'CERTIFICATION',
    };
  }, [target, activeCycle?.type, activeCycle?.targetLevel, hasActiveCertificate, currentLevel]);

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <p className="text-sm text-blue-dark">Загрузка…</p>
      </div>
    );
  }

  if (error || !data || !userDetails) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <p className="text-error">Ошибка загрузки</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">Группы и управление статусом</h2>
      </div>

      <div className="p-6 space-y-6">
        <section
          className="rounded-2xl border p-4 space-y-3"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="text-sm text-blue-dark space-y-2">
              <p>
                <strong>Имя:</strong> {data.user.fullName}
              </p>
              <p>
                <strong>Email:</strong> {data.user.email}
              </p>
              <p>
                <strong>Активная группа:</strong> {activeGroupName}
              </p>
              <p>
                <strong>Текущая цель:</strong> {currentTargetLabel}
              </p>
            </div>

            <div className="text-sm text-blue-dark space-y-2">
              <p>
                <strong>Активный цикл:</strong>{' '}
                {activeCycle ? (
                  <>
                    {getCycleTypeLabel(activeCycle.type)} — <b>{cycleTargetLabel}</b>
                    {' · '}с {formatDate(activeCycle.startedAt)}
                  </>
                ) : (
                  'нет'
                )}
              </p>

              <p>
                <strong>Последний сертификат:</strong> {latestCertificateLabel}
              </p>
              <p>
                <strong>Выдан:</strong> {formatDate(latestCertificate?.issuedAt)}
              </p>
              <p>
                <strong>Статус сертификата:</strong>{' '}
                {latestCertificate ? getCertificateStatusText(latestCertificate.expiresAt) : 'нет'}
                {latestCertificate?.expiresAt
                  ? ` · до ${formatDate(latestCertificate.expiresAt)}`
                  : ''}
              </p>
            </div>
          </div>
        </section>

        {currentUser?.role === 'ADMIN' && (
          <section
            className="rounded-2xl border p-4 space-y-4"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <div>
              <h3 className="text-base font-semibold text-blue-dark">Управление целью</h3>
              <p className="text-sm text-gray-600 mt-1">
                Здесь админ задаёт пользователю следующий шаг: повышение уровня или ресертификацию.
              </p>
            </div>

            {activeCycle ? (
              <div className="space-y-4">
                <div className="text-sm text-blue-dark">
                  <p>
                    <strong>Сейчас у пользователя активен цикл:</strong>{' '}
                    {getCycleTypeLabel(activeCycle.type)} — <b>{cycleTargetLabel}</b>
                  </p>
                  <p className="mt-1">
                    Начат: <b>{formatDate(activeCycle.startedAt)}</b>
                  </p>
                </div>

                <div
                  className="border-t pt-4 space-y-3"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <div className="text-sm font-medium text-blue-dark">Отмена активного цикла</div>

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
                    className="btn btn-brand"
                    onClick={handleAbandonCycle}
                    disabled={abandonCycle.isPending}
                  >
                    {abandonCycle.isPending ? 'Отменяем…' : 'Отменить активный цикл'}
                  </button>
                </div>
              </div>
            ) : noAvailableTargetOptions ? (
              <p className="text-sm italic text-blue-dark">
                Сейчас для пользователя нет доступных действий: нет уровней выше текущего и нет
                действующего сертификата для ресертификации.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-blue-dark">
                  <strong>Доступные действия:</strong>
                  <ul className="mt-2 space-y-1 list-disc pl-5">
                    {availableActions.map((item) => (
                      <li key={`${item.mode}-${item.level}`}>{item.label}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-medium text-blue-dark block mb-2">
                    Назначить новый целевой уровень
                  </label>

                  <select
                    className="border rounded-lg p-2 w-full"
                    style={{ borderColor: 'var(--color-green-light)' }}
                    value={target ?? ''}
                    onChange={(e) => setTarget(e.target.value || null)}
                  >
                    <option value="">— выбрать уровень —</option>
                    {availableActions.map((item) => (
                      <option key={`${item.mode}-${item.level}`} value={item.level}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAction && (
                  <div className="text-sm text-blue-dark">
                    Будет сохранено действие:{' '}
                    <b>
                      {selectedAction.mode === 'RENEWAL' ? 'ресертификация' : 'сертификация'} —{' '}
                      {getDisplayedLevelLabel(
                        selectedAction.level,
                        activeGroup?.name ?? null,
                        selectedAction.mode,
                      )}
                    </b>
                  </div>
                )}

                <button
                  className="btn btn-brand"
                  onClick={saveTarget}
                  disabled={updateTargetLevel.isPending || !target}
                >
                  {updateTargetLevel.isPending ? 'Сохраняем…' : 'Сохранить цель'}
                </button>
              </div>
            )}
          </section>
        )}

        <section
          className="rounded-2xl border overflow-x-auto"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{
              borderColor: 'var(--color-green-light)',
              background: 'var(--color-blue-soft)',
            }}
          >
            <h3 className="text-base font-semibold text-blue-dark">Группы пользователя</h3>
          </div>

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
          <div
            className="px-4 py-4 border-t flex justify-end"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <button
              className="btn btn-brand"
              onClick={save}
              disabled={mutation.isPending || isLoading}
            >
              {mutation.isPending ? 'Сохраняем…' : 'Сохранить группы'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
