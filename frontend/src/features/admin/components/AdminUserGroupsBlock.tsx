import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useUserGroupsById } from '@/features/groups/hooks/useUserGroupsById';
import { useUpdateUserGroups } from '@/features/groups/hooks/useUpdateUserGroups';
import { useAbandonActiveCycle } from '@/features/admin/hooks/useAbandonActiveCycle';
import { useUserDetails } from '@/features/admin/hooks/useUserDetails';
import { useUpdateTargetLevel } from '@/features/admin/hooks/useUpdateTargetLevel';
import { EditCertificateModal } from '@/features/admin/components/EditCertificateModal';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { targetLevelLabels } from '@/utils/labels';

type TargetLevel = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
type GoalMode = 'CERTIFICATION' | 'RENEWAL';

const LEVEL_RANK_MAP: Record<TargetLevel, number> = {
  INSTRUCTOR: 2,
  CURATOR: 3,
  SUPERVISOR: 4,
};

const processTypeLabels: Record<GoalMode, string> = {
  CERTIFICATION: 'Сертификация',
  RENEWAL: 'Ресертификация',
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
  return isCertificateActive(expiresAt) ? `действует до ${formatDate(expiresAt)}` : `просрочен с ${formatDate(expiresAt)}`;
}

function getDisplayedLevelLabel(
  level: TargetLevel | null | undefined,
  activeGroupName: string | null | undefined,
  mode?: GoalMode | null,
) {
  if (!level) return '—';

  if (level === 'SUPERVISOR' && mode === 'RENEWAL' && activeGroupName === 'Опытный Супервизор') {
    return 'Опытный супервизор';
  }

  return targetLevelLabels[level] ?? level;
}

function getIssuedGroupAfterProcess(
  level: TargetLevel,
  mode: GoalMode,
  activeGroupName: string | null | undefined,
) {
  if (level === 'SUPERVISOR' && mode === 'RENEWAL' && activeGroupName === 'Опытный Супервизор') {
    return 'Опытный супервизор';
  }

  return targetLevelLabels[level] ?? level;
}

type ActionOption = {
  level: TargetLevel;
  mode: GoalMode;
  label: string;
};

function actionKey(action: ActionOption) {
  return `${action.mode}:${action.level}`;
}

export default function AdminUserGroupsBlock({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserGroupsById(userId, true);
  const { data: userDetails, refetch: refetchUserDetails } = useUserDetails(userId);
  const updateGroups = useUpdateUserGroups(userId);
  const updateTargetLevel = useUpdateTargetLevel(userId);
  const abandonCycle = useAbandonActiveCycle(userId);
  const { confirm } = useConfirm();

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedProcessKey, setSelectedProcessKey] = useState('');
  const [abandonReason, setAbandonReason] = useState('');
  const [isCertificateEditOpen, setIsCertificateEditOpen] = useState(false);

  const savedActiveGroup = useMemo(() => {
    if (!data) return null;
    return data.allGroups
      .filter((group) => data.currentGroupIds.includes(group.id))
      .sort((a, b) => b.rank - a.rank)[0] ?? null;
  }, [data]);

  useEffect(() => {
    setSelectedGroupId(savedActiveGroup?.id ?? '');
  }, [savedActiveGroup?.id]);

  const selectedGroup = data?.allGroups.find((group) => group.id === selectedGroupId) ?? null;
  const groupChanged = Boolean(selectedGroupId && selectedGroupId !== (savedActiveGroup?.id ?? ''));
  const activeCycle = userDetails?.activeCycle ?? null;
  const latestCertificate = userDetails?.latestCertificate ?? null;
  const hasActiveCertificate =
    !!latestCertificate && isCertificateActive(latestCertificate.expiresAt);
  const activeCertificate = useMemo(() => {
    return (
      [...(userDetails?.certificates ?? [])]
        .filter((certificate) => isCertificateActive(certificate.expiresAt))
        .sort(
          (a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime(),
        )[0] ?? null
    );
  }, [userDetails?.certificates]);
  const currentLevel = resolveCurrentLevelByGroupName(savedActiveGroup?.name);
  const currentRank = savedActiveGroup?.rank ?? 0;

  const availableActions = useMemo<ActionOption[]>(() => {
    const result: ActionOption[] = [];

    for (const [level, rank] of Object.entries(LEVEL_RANK_MAP) as [TargetLevel, number][]) {
      if (rank > currentRank) {
        result.push({
          level,
          mode: 'CERTIFICATION',
          label: `Начать сертификацию на уровень «${targetLevelLabels[level]}»`,
        });
      }
    }

    if (hasActiveCertificate && currentLevel) {
      const renewalLabel =
        currentLevel === 'SUPERVISOR' && savedActiveGroup?.name === 'Опытный Супервизор'
          ? 'Начать ресертификацию уровня «Опытный супервизор»'
          : `Начать ресертификацию уровня «${targetLevelLabels[currentLevel]}»`;

      result.unshift({
        level: currentLevel,
        mode: 'RENEWAL',
        label: renewalLabel,
      });
    }

    return result;
  }, [currentRank, currentLevel, hasActiveCertificate, savedActiveGroup?.name]);

  useEffect(() => {
    if (!activeCycle) {
      setSelectedProcessKey('');
      return;
    }

    setSelectedProcessKey(actionKey({ mode: activeCycle.type, level: activeCycle.targetLevel, label: '' }));
  }, [activeCycle?.type, activeCycle?.targetLevel]);

  const selectedAction =
    availableActions.find((item) => actionKey(item) === selectedProcessKey) ?? null;

  const processText = activeCycle
    ? `${processTypeLabels[activeCycle.type]} на ${getDisplayedLevelLabel(
        activeCycle.targetLevel,
        savedActiveGroup?.name,
        activeCycle.type,
      )}, с ${formatDate(activeCycle.startedAt)}`
    : userDetails?.targetLevel
      ? `Цель выбрана: ${getDisplayedLevelLabel(userDetails.targetLevel, savedActiveGroup?.name)}`
      : 'не начат';

  const afterCertificateText = activeCycle
    ? getIssuedGroupAfterProcess(activeCycle.targetLevel, activeCycle.type, savedActiveGroup?.name)
    : selectedAction
      ? getIssuedGroupAfterProcess(selectedAction.level, selectedAction.mode, savedActiveGroup?.name)
      : '—';

  const saveGroup = async () => {
    if (!selectedGroup || !data) {
      toast.error('Выберите статус пользователя');
      return;
    }

    const message =
      groupChanged && (activeCycle || userDetails?.targetLevel)
        ? 'Сменить текущий статус пользователя? Текущий цикл будет закрыт, целевой уровень будет сброшен.'
        : 'Сохранить текущий статус пользователя?';

    const ok = await confirm({
      message,
      confirmLabel: 'Сохранить',
      variant: groupChanged && activeCycle ? 'danger' : 'primary',
    });
    if (!ok) return;

    try {
      await updateGroups.mutateAsync([selectedGroup.id]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка при сохранении статуса');
    }
  };

  const saveProcess = async () => {
    if (!selectedAction) return;

    const ok = await confirm({
      message: `${selectedAction.label}?`,
      confirmLabel: 'Начать',
    });
    if (!ok) return;

    try {
      await updateTargetLevel.mutateAsync({
        targetLevel: selectedAction.level,
        goalMode: selectedAction.mode,
      });
    } catch {
      // toast уже показан в хуке
    }
  };

  const handleAbandonCycle = async () => {
    const reason = abandonReason.trim();
    if (!reason) {
      toast.error('Укажите причину отмены цикла');
      return;
    }

    const ok = await confirm({
      message: 'Отменить текущий цикл пользователя?',
      confirmLabel: 'Отменить цикл',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await abandonCycle.mutateAsync(reason);
      setAbandonReason('');
    } catch {
      // toast уже показан в хуке
    }
  };

  if (isLoading) {
    return <p className="dashboard-v2-text p-4">Загрузка...</p>;
  }

  if (error || !data || !userDetails) {
    return <p className="dashboard-v2-text p-4 text-[var(--color-danger)]">Ошибка загрузки</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
        <h2 className="dashboard-v2-title mb-4">Статус и сертификация</h2>

        <div className="overflow-hidden rounded-[12px] bg-white/45">
          <Meta label="ФИО" value={data.user.fullName || '—'} />
          <Meta label="Email" value={data.user.email} />
          <Meta label="Текущий статус" value={savedActiveGroup?.name ?? '—'} />
          <Meta label="Текущий цикл" value={processText} />
          <Meta
            label="Последний сертификат"
            value={
              latestCertificate
                ? `${latestCertificate.group.name} · ${getCertificateStatusText(latestCertificate.expiresAt)}`
                : 'нет'
            }
          />
          <Meta label="После выдачи сертификата" value={afterCertificateText} />
        </div>

        {userDetails.targetLevel && !activeCycle ? (
          <div className="mt-4 rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)]">
            У пользователя выбран целевой уровень, но активный цикл не найден. Проверьте состояние
            перед выдачей сертификата.
          </div>
        ) : null}

        <div className="mt-4 border-t border-white/70 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="dashboard-v2-title">Активный сертификат</h3>
            {activeCertificate ? (
              <span className="rounded-full bg-[var(--color-green-brand)] px-3 py-1 text-[12px] font-bold text-white">
                Активный
              </span>
            ) : null}
          </div>

          {!activeCertificate ? (
            <div className="rounded-[12px] bg-white/45 px-3 py-3 dashboard-v2-text">
              Активного сертификата нет.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[12px] bg-white/45">
              <Meta
                label="Сертификат"
                value={`${activeCertificate.title || 'Сертификат'}${
                  activeCertificate.number ? ` №${activeCertificate.number}` : ''
                }`}
              />
              <Meta label="Группа" value={activeCertificate.group?.name ?? '—'} />
              <Meta label="Выдан" value={formatDate(activeCertificate.issuedAt)} />
              <Meta
                label="Действует до"
                value={activeCertificate.expiresAt ? formatDate(activeCertificate.expiresAt) : 'бессрочно'}
              />
              <Meta
                label="Подтвердил"
                value={
                  activeCertificate.confirmedBy
                    ? activeCertificate.confirmedBy.fullName || activeCertificate.confirmedBy.email
                    : '—'
                }
              />
              {activeCertificate.comment ? (
                <Meta label="Комментарий" value={activeCertificate.comment} />
              ) : null}

              <div className="flex flex-wrap gap-2 px-3 py-3">
                {activeCertificate.file ? (
                  <a
                    href={`/uploads/${activeCertificate.file.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn dashboard-v2-action dashboard-v2-action-secondary"
                  >
                    Открыть файл
                  </a>
                ) : null}
                <button
                  type="button"
                  className="btn dashboard-v2-action dashboard-v2-action-primary"
                  onClick={() => setIsCertificateEditOpen(true)}
                >
                  Редактировать
                </button>
              </div>
            </div>
          )}
        </div>

        {activeCertificate && isCertificateEditOpen ? (
          <EditCertificateModal
            userId={userId}
            certificate={{
              id: activeCertificate.id,
              title: activeCertificate.title,
              number: activeCertificate.number,
              issuedAt: activeCertificate.issuedAt,
              expiresAt: activeCertificate.expiresAt,
              file: activeCertificate.file,
              group: activeCertificate.group,
            }}
            onClose={() => setIsCertificateEditOpen(false)}
            onUpdated={() => {
              void refetchUserDetails();
            }}
          />
        ) : null}
      </section>

      <section className="rounded-[16px] bg-white p-4 shadow-[0_2px_12px_rgba(31,48,94,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="dashboard-v2-label mb-1 block">Текущий статус пользователя</label>
            <select
              className="input-design h-[38px]"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              disabled={updateGroups.isPending}
            >
              <option value="">Выберите статус</option>
              {data.allGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn dashboard-v2-action dashboard-v2-action-primary"
            onClick={saveGroup}
            disabled={updateGroups.isPending || !selectedGroupId || !groupChanged}
          >
            {updateGroups.isPending ? 'Сохраняем...' : 'Сохранить статус'}
          </button>
        </div>

        {groupChanged ? (
          <div className="mt-3 rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)]">
            При смене статуса текущий цикл будет закрыт, а целевой уровень сброшен.
          </div>
        ) : null}
      </section>

      <section className="rounded-[16px] bg-white p-4 shadow-[0_2px_12px_rgba(31,48,94,0.08)]">
        {activeCycle ? (
          <div className="space-y-4">
            <div>
              <h3 className="dashboard-v2-title">Текущий цикл</h3>
              <p className="dashboard-v2-text mt-2">
                {processText}. Выдать сертификат можно именно по этому циклу.
              </p>
            </div>

            <div>
              <label className="dashboard-v2-label mb-1 block">Причина отмены цикла</label>
              <textarea
                className="input-design min-h-[86px] resize-y py-2"
                placeholder="Например: пользователь ошибочно выбрал уровень"
                value={abandonReason}
                onChange={(event) => setAbandonReason(event.target.value)}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={abandonCycle.isPending}
              />
            </div>

            <button
              type="button"
              className="btn dashboard-v2-action dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)]"
              onClick={handleAbandonCycle}
              disabled={abandonCycle.isPending}
            >
              {abandonCycle.isPending ? 'Отменяем...' : 'Отменить текущий цикл'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h3 className="dashboard-v2-title mb-3">Начать цикл</h3>
              <label className="dashboard-v2-label mb-1 block">Действие</label>
              <select
                className="input-design h-[38px]"
                value={selectedProcessKey}
                onChange={(event) => setSelectedProcessKey(event.target.value)}
                disabled={groupChanged || updateTargetLevel.isPending || availableActions.length === 0}
              >
                <option value="">Выберите действие</option>
                {availableActions.map((item) => (
                  <option key={actionKey(item)} value={actionKey(item)}>
                    {item.label}
                  </option>
                ))}
              </select>
              {availableActions.length === 0 ? (
                <p className="dashboard-v2-caption mt-2">
                  Для текущего статуса нет доступных циклов сертификации.
                </p>
              ) : null}
              {groupChanged ? (
                <p className="dashboard-v2-caption mt-2 text-[var(--color-danger)]">
                  Сначала сохраните новый статус пользователя.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="btn dashboard-v2-action dashboard-v2-action-primary"
              onClick={saveProcess}
              disabled={groupChanged || updateTargetLevel.isPending || !selectedAction}
            >
              {updateTargetLevel.isPending ? 'Запускаем...' : 'Начать цикл'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-[34px] grid-cols-[180px_minmax(0,1fr)] items-center border-b border-white/70 px-3 py-2 last:border-b-0 md:grid-cols-[170px_minmax(0,1fr)]">
      <span className="dashboard-v2-caption">{label}:</span>
      <span className="dashboard-v2-text min-w-0 font-semibold">{value}</span>
    </div>
  );
}
