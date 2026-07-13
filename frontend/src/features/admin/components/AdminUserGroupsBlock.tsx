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
import { formatCertificationLevelName, targetLevelLabels } from '@/utils/labels';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { formatCertificateDate, isCertificateDateActive } from '@/features/certificate/utils/certificateDates';

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

function isCertificateActive(expiresAt: string | null): boolean {
  return !expiresAt || isCertificateDateActive(expiresAt);
}

type GroupLike = { name?: string | null; rank?: number | null } | null | undefined;

function normalizeGroupName(groupName: string | null | undefined) {
  return (groupName ?? '').trim().toLowerCase();
}

function isExperiencedSupervisorGroup(groupName: string | null | undefined) {
  return normalizeGroupName(groupName) === 'опытный супервизор';
}

function resolveCurrentLevelByGroup(group: GroupLike): TargetLevel | null {
  const groupName = normalizeGroupName(group?.name);
  if (groupName === 'инструктор') return 'INSTRUCTOR';
  if (groupName === 'куратор') return 'CURATOR';
  if (groupName === 'супервизор' || groupName === 'опытный супервизор') return 'SUPERVISOR';
  if (group?.rank === 2) return 'INSTRUCTOR';
  if (group?.rank === 3) return 'CURATOR';
  if ((group?.rank ?? 0) >= 4) return 'SUPERVISOR';
  return null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

function getCertificateStatusText(expiresAt: string | null) {
  if (!expiresAt) return 'без срока окончания';
  return isCertificateDateActive(expiresAt)
    ? `действует до ${formatCertificateDate(expiresAt)}`
    : `просрочен с ${formatCertificateDate(expiresAt)}`;
}

function getDisplayedLevelLabel(
  level: TargetLevel | null | undefined,
  activeGroupName: string | null | undefined,
  mode?: GoalMode | null,
) {
  if (!level) return '—';

  if (level === 'SUPERVISOR' && mode === 'RENEWAL' && isExperiencedSupervisorGroup(activeGroupName)) {
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
  const activeCertificate = useMemo(() => {
    return (
      [...(userDetails?.certificates ?? [])]
        .filter((certificate) => isCertificateActive(certificate.expiresAt))
        .sort(
          (a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime(),
        )[0] ?? null
    );
  }, [userDetails?.certificates]);
  const currentLevel = resolveCurrentLevelByGroup(savedActiveGroup);
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

    if (currentLevel) {
      const renewalLabel =
        currentLevel === 'SUPERVISOR' && isExperiencedSupervisorGroup(savedActiveGroup?.name)
          ? 'Начать ресертификацию уровня «Опытный супервизор»'
          : `Начать ресертификацию уровня «${targetLevelLabels[currentLevel]}»`;

      result.unshift({
        level: currentLevel,
        mode: 'RENEWAL',
        label: renewalLabel,
      });
    }

    return result;
  }, [currentRank, currentLevel, savedActiveGroup?.name]);

  useEffect(() => {
    if (!activeCycle) {
      setSelectedProcessKey('');
      return;
    }

    setSelectedProcessKey(actionKey({ mode: activeCycle.type, level: activeCycle.targetLevel, label: '' }));
  }, [activeCycle]);

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

  const activeCertificateText = activeCertificate
    ? `${formatCertificationLevelName(activeCertificate.group?.name)}${
        activeCertificate.expiresAt ? ` · до ${formatCertificateDate(activeCertificate.expiresAt)}` : ' · бессрочно'
      }`
    : 'нет';

  const saveGroup = async () => {
    if (!selectedGroup || !data) {
      toast.error(UI_TOAST_MESSAGES.admin.currentLevelRequired);
      return;
    }

    const message =
      groupChanged && (activeCycle || userDetails?.targetLevel)
        ? 'Сменить уровень сертификации? Активная сертификация будет закрыта, цель сертификации будет сброшена.'
        : 'Сохранить уровень сертификации?';

    const ok = await confirm({
      message,
      confirmLabel: 'Сохранить',
      variant: groupChanged && activeCycle ? 'danger' : 'primary',
    });
    if (!ok) return;

    try {
      await updateGroups.mutateAsync([selectedGroup.id]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || UI_TOAST_MESSAGES.admin.saveCurrentLevelFailed);
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
      toast.error(UI_TOAST_MESSAGES.admin.abandonCycleReasonRequired);
      return;
    }

    const ok = await confirm({
      message: 'Отменить активную сертификацию пользователя?',
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
        <h2 className="dashboard-v2-title mb-4">Уровень и сертификация</h2>

        <InfoTable
          rows={[
            [
              { label: 'ФИО', value: data.user.fullName || '—' },
              { label: 'Email', value: data.user.email },
            ],
            [
              { label: 'Уровень сертификации', value: formatCertificationLevelName(savedActiveGroup?.name) },
              { label: 'Активная сертификация', value: processText },
            ],
            [
              {
                label: 'Последний сертификат',
                value: latestCertificate
                  ? `${latestCertificate.group.name} · ${getCertificateStatusText(latestCertificate.expiresAt)}`
                  : 'нет',
              },
              { label: 'Активный сертификат', value: activeCertificateText },
            ],
          ]}
        />

        {userDetails.targetLevel && !activeCycle ? (
          <div className="mt-4 rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)]">
            У пользователя выбрана цель сертификации, но активная сертификация не найдена. Проверьте состояние
            перед выдачей сертификата.
          </div>
        ) : null}

        {activeCertificate ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-white/45 px-4 py-3">
            <div className="min-w-0">
              <p className="dashboard-v2-label">Активный сертификат</p>
              <p className="dashboard-v2-text mt-1 font-semibold">
                {activeCertificate.title || 'Сертификат'}
                {activeCertificate.number ? ` №${activeCertificate.number}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
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
        ) : null}

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

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <section className="rounded-[16px] bg-white p-4 shadow-[0_2px_12px_rgba(31,48,94,0.08)]">
          <h3 className="dashboard-v2-title mb-3">Уровень сертификации</h3>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label className="dashboard-v2-label mb-1 block">Уровень пользователя</label>
              <select
                className="input-design h-[38px]"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={updateGroups.isPending}
              >
                <option value="">Выберите уровень</option>
                {data.allGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {formatCertificationLevelName(group.name)}
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
              {updateGroups.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>

          {groupChanged ? (
            <div className="mt-3 rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)]">
              При смене уровня активная сертификация будет закрыта, а цель сертификации сброшена.
            </div>
          ) : null}
        </section>

        <section className="rounded-[16px] bg-white p-4 shadow-[0_2px_12px_rgba(31,48,94,0.08)]">
          {activeCycle ? (
            <div className="space-y-4">
              <div>
                <h3 className="dashboard-v2-title">Активная сертификация</h3>
                <p className="dashboard-v2-text mt-2">
                  {processText}. Выдать сертификат можно именно по этой сертификации.
                </p>
              </div>

              <div>
                <label className="dashboard-v2-label mb-1 block">Причина отмены</label>
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
                {abandonCycle.isPending ? 'Отменяем...' : 'Отменить сертификацию'}
              </button>
            </div>
          ) : (
            <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div>
                <h3 className="dashboard-v2-title mb-3">Начать сертификацию</h3>
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
                    Для текущего уровня нет доступных действий.
                  </p>
                ) : null}
                <p className="dashboard-v2-caption mt-2">
                  Ресертификацию можно начать вручную без сертификата в системе. Основание проверяет администратор.
                </p>
                {groupChanged ? (
                  <p className="dashboard-v2-caption mt-2 text-[var(--color-danger)]">
                    Сначала сохраните новый уровень сертификации пользователя.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                className="btn dashboard-v2-action dashboard-v2-action-primary"
                onClick={saveProcess}
                disabled={groupChanged || updateTargetLevel.isPending || !selectedAction}
              >
                {updateTargetLevel.isPending ? 'Запускаем...' : 'Начать'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type InfoCell = {
  label: string;
  value: string;
};

function InfoTable({ rows }: { rows: [InfoCell, InfoCell][] }) {
  return (
    <div className="overflow-hidden rounded-[12px] bg-white/45">
      {rows.map(([left, right]) => (
        <div
          key={`${left.label}-${right.label}`}
          className="grid border-b border-white/70 last:border-b-0 md:grid-cols-2"
        >
          <InfoTableCell {...left} />
          <InfoTableCell {...right} bordered />
        </div>
      ))}
    </div>
  );
}

function InfoTableCell({ label, value, bordered = false }: InfoCell & { bordered?: boolean }) {
  return (
    <div
      className={[
        'grid min-h-[42px] grid-cols-[150px_minmax(0,1fr)] items-center gap-3 px-3 py-2',
        bordered ? 'border-t border-white/70 md:border-l md:border-t-0' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="dashboard-v2-caption">{label}</span>
      <span className="dashboard-v2-text min-w-0 font-semibold">{value}</span>
    </div>
  );
}
