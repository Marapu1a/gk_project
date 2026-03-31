// src/features/dashboard-v2/dashboardV2/components/certification-block/component/CertificationBlock.tsx
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import type { CurrentUser } from '@/features/auth/api/me';
import { isTargetLocked } from '@/features/auth/api/me';
import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { useMyCertificates } from '@/features/certificate/hooks/useMyCertificates';
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useSetTargetLevel } from '@/features/user/hooks/useSetTargetLevel';
import type { TargetLevel as ApiTargetLevel, GoalMode } from '@/features/user/api/setTargetLevel';

type Props = {
  user: CurrentUser;
};

const LEVELS = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
type Level = (typeof LEVELS)[number];

const TARGET_LEVEL_LABELS: Record<Level, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const FULL_ORDER = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

type GoalOption = {
  value: string;
  label: string;
  targetLevel: ApiTargetLevel;
  goalMode: GoalMode;
};

type CeuSummaryLike = {
  usable?: {
    ethics?: number;
    cultDiver?: number;
    supervision?: number;
    general?: number;
  } | null;
  required?: {
    ethics?: number;
    cultDiver?: number;
    supervision?: number;
    general?: number;
  } | null;
};

type SupervisionSummaryLike = {
  usable?: {
    supervision?: number;
  } | null;
  required?: {
    supervision?: number;
  } | null;
};

type CertificateLike = {
  isActiveNow?: boolean;
};

function levelIndex(level: Level) {
  return FULL_ORDER.indexOf(TARGET_LEVEL_LABELS[level] as (typeof FULL_ORDER)[number]);
}

function getRenewalOption(activeGroupName?: string): GoalOption | null {
  if (activeGroupName === 'Инструктор') {
    return {
      value: 'RENEWAL_INSTRUCTOR',
      label: 'Ресертификация: Инструктор',
      targetLevel: 'INSTRUCTOR',
      goalMode: 'RENEWAL',
    };
  }

  if (activeGroupName === 'Куратор') {
    return {
      value: 'RENEWAL_CURATOR',
      label: 'Ресертификация: Куратор',
      targetLevel: 'CURATOR',
      goalMode: 'RENEWAL',
    };
  }

  if (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор') {
    return {
      value: 'RENEWAL_SUPERVISOR',
      label: 'Ресертификация: Опытный Супервизор',
      targetLevel: 'SUPERVISOR',
      goalMode: 'RENEWAL',
    };
  }

  return null;
}

function getDisplayTargetLabel(
  targetLevel: ApiTargetLevel,
  goalMode: GoalMode,
  activeGroupName?: string,
) {
  if (!targetLevel) return null;

  if (
    goalMode === 'RENEWAL' &&
    targetLevel === 'SUPERVISOR' &&
    (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор')
  ) {
    return 'Опытный Супервизор';
  }

  return TARGET_LEVEL_LABELS[targetLevel];
}

export function CertificationBlock({ user }: Props) {
  const setTarget = useSetTargetLevel(user.id);
  const { data: certificates = [] } = useMyCertificates();

  const activeGroupName = user.activeGroup?.name;
  const targetLevel = user.targetLevel ?? null;

  const activeCycleType = (((user as any).activeCycle?.type as GoalMode | undefined) ??
    'CERTIFICATION') as GoalMode;

  const targetLevelName = getDisplayTargetLabel(targetLevel, activeCycleType, activeGroupName);

  const [selected, setSelected] = useState<string>('');

  const activeIdx = user.activeGroup
    ? FULL_ORDER.indexOf(user.activeGroup.name as (typeof FULL_ORDER)[number])
    : -1;

  const availableCertificationLevels = useMemo(
    () => LEVELS.filter((level) => levelIndex(level) > activeIdx),
    [activeIdx],
  );

  const hasActiveCertificate = (certificates as CertificateLike[]).some((cert) => cert.isActiveNow);

  const renewalOption = useMemo(() => getRenewalOption(activeGroupName), [activeGroupName]);

  const options = useMemo<GoalOption[]>(() => {
    const base: GoalOption[] = availableCertificationLevels.map((level) => ({
      value: `CERTIFICATION_${level}`,
      label: TARGET_LEVEL_LABELS[level],
      targetLevel: level,
      goalMode: 'CERTIFICATION',
    }));

    if (!targetLevel && hasActiveCertificate && renewalOption) {
      base.push(renewalOption);
    }

    return base;
  }, [availableCertificationLevels, hasActiveCertificate, renewalOption, targetLevel]);

  useEffect(() => {
    if (!targetLevel) {
      setSelected('');
      return;
    }

    setSelected(`${activeCycleType}_${targetLevel}`);
  }, [targetLevel, activeCycleType]);

  useEffect(() => {
    if (!selected) return;

    const exists = options.some((option) => option.value === selected);
    if (!exists && !targetLevel) {
      setSelected('');
    }
  }, [selected, options, targetLevel]);

  const selectedOption = options.find((option) => option.value === selected) ?? null;

  const progress = useQualificationProgress(activeGroupName, targetLevel) as {
    ceuReady?: boolean;
    supervisionReady?: boolean;
    documentsReady?: boolean;
    loading?: boolean;
    isEligible?: boolean;
    examPaid?: boolean;
  };

  const ceuSummaryQuery = useCeuSummary(targetLevel);
  const supervisionSummaryQuery = useSupervisionSummary();

  const loading =
    !!progress.loading || ceuSummaryQuery.isLoading || supervisionSummaryQuery.isLoading;

  const locked = isTargetLocked(user);
  const currentTargetLevel = user.targetLevel as ApiTargetLevel | null;
  const currentGoalMode = activeCycleType;

  const noChange =
    !selectedOption && currentTargetLevel === null && !targetLevel
      ? true
      : !!selectedOption &&
        selectedOption.targetLevel === currentTargetLevel &&
        selectedOption.goalMode === currentGoalMode;

  const selectDisabled = locked || options.length === 0;

  const saveDisabled = setTarget.isPending || locked || !selectedOption || noChange;

  const serverErr = (setTarget.error as any)?.response?.data?.error as string | undefined;

  const errorMessage =
    serverErr === 'TARGET_LOCKED'
      ? 'Цель уже выбрана. Сменить можно после повышения уровня или через администратора.'
      : serverErr === 'TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP'
        ? 'Эта цель недоступна для вашего текущего уровня.'
        : serverErr === 'TARGET_BELOW_ACTIVE'
          ? 'Нельзя выбрать цель ниже уже достигнутого уровня.'
          : serverErr === 'NO_TARGET_FOR_SUPERVISOR'
            ? 'Для супервизоров и опытных супервизоров обычная цель больше не требуется.'
            : serverErr === 'INVALID_GOAL_MODE'
              ? 'Некорректный режим выбора цели.'
              : serverErr === 'RENEWAL_NOT_AVAILABLE'
                ? 'Ресертификация недоступна.'
                : serverErr === 'TARGET_ALREADY_SELECTED'
                  ? 'Сначала нужно сбросить текущую цель.'
                  : serverErr === 'RENEWAL_TARGET_NOT_ALLOWED'
                    ? 'Ресертификация для текущего уровня недоступна.'
                    : null;

  const ceuSummary = (ceuSummaryQuery.data ?? null) as CeuSummaryLike | null;
  const supervisionSummary = (supervisionSummaryQuery.data ??
    null) as SupervisionSummaryLike | null;

  const ceuCurrent = sumCeu(ceuSummary?.usable);
  const ceuRequired = sumCeu(ceuSummary?.required);

  const supervisionCurrent = Number(supervisionSummary?.usable?.supervision ?? 0);
  const supervisionRequired = Number(supervisionSummary?.required?.supervision ?? 0);

  const examButtonLabel = progress.examPaid
    ? 'Подать заявку на экзамен'
    : 'Доступ к экзамену не оплачен';

  const handleSave = () => {
    if (saveDisabled || !selectedOption) return;

    const isRenewal = selectedOption.goalMode === 'RENEWAL';
    const label = selectedOption.label;

    toast(
      isRenewal
        ? `Вы собираетесь выбрать: «${label}». После выбора изменить его нельзя, пока не будет завершён текущий цикл.`
        : `Вы собираетесь выбрать уровень: «${label}». После выбора изменить его нельзя, пока вы не подтвердите установленную квалификацию.`,
      {
        action: {
          label: 'Подтвердить',
          onClick: () =>
            setTarget.mutate({
              targetLevel: selectedOption.targetLevel,
              goalMode: selectedOption.goalMode,
            }),
        },
        cancel: {
          label: 'Отмена',
          onClick: () => {},
        },
      },
    );
  };

  if (loading) {
    return (
      <section className="card-section">
        <p className="text-sm text-blue-dark">Загрузка...</p>
      </section>
    );
  }

  if (!targetLevel) {
    return (
      <section className="card-section flex flex-col gap-7">
        <h2 className="text-center text-[26px] font-extrabold leading-none text-blue-dark">
          Сертификация и ресертификация
        </h2>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <select
              className="h-11 w-full appearance-none rounded-button border-0 bg-[var(--color-blue-dark)] px-4 pr-11 text-center text-[18px] font-extrabold leading-none text-white outline-none"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={selectDisabled}
              title={
                locked ? 'Сменить можно после повышения уровня или через администратора' : undefined
              }
            >
              <option value="">Выбрать целевой уровень</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white">
              <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
                <path
                  d="M1 1.5L7 7.5L13 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-dark h-11 w-full rounded-button text-[18px] font-extrabold leading-none"
            disabled={saveDisabled}
            onClick={handleSave}
          >
            {setTarget.isPending ? 'Сохраняем...' : 'Выбрать целевой уровень'}
          </button>
        </div>

        <div className="space-y-5 text-center text-[15px] leading-[1.35] text-[#97A0BD]">
          <p>
            Поменять выбор будет нельзя,
            <br />
            пока вы не подтвердите установленный
            <br />
            уровень квалификации
          </p>

          <p>
            Если допустили ошибку,
            <br />
            <span className="text-blue-dark underline underline-offset-2">
              обратитесь к администрации
            </span>
          </p>
        </div>

        {errorMessage && (
          <p className="text-center text-sm text-[var(--color-pink-danger)]">{errorMessage}</p>
        )}

        {setTarget.isSuccess && !errorMessage && (
          <p className="text-center text-sm text-[var(--color-green-dark)]">Цель обновлена</p>
        )}

        <div className="flex h-11 items-center justify-center rounded-button bg-[#B8C0D1] px-5 text-[18px] font-extrabold leading-none text-white">
          Не выбрано
        </div>
      </section>
    );
  }

  return (
    <section className="card-section flex flex-col gap-7">
      <h2 className="text-center text-[26px] font-extrabold leading-none text-blue-dark">
        Целевой уровень сертификации
      </h2>

      <div className="flex h-11 items-center justify-center rounded-button bg-[var(--color-blue-soft)] px-5 text-center text-[18px] font-extrabold leading-none text-blue-dark">
        {targetLevelName}
      </div>

      <p className="text-center text-[15px] leading-[1.35] text-[#97A0BD]">
        Выполните условия
        <br />
        целевого уровня сертификации
      </p>

      <ul className="space-y-4">
        <StatusRow
          ok={!!progress.ceuReady}
          label="CEU-Баллы"
          value={`${formatNumber(ceuCurrent)} / ${formatNumber(ceuRequired)}`}
        />

        <StatusRow
          ok={!!progress.supervisionReady}
          label="Часы супервизии"
          value={`${formatNumber(supervisionCurrent)} / ${formatNumber(supervisionRequired)}`}
        />

        <StatusRow
          ok={!!progress.documentsReady}
          label="Документы"
          value={progress.documentsReady ? 'подтверждено' : 'не подтверждено'}
        />
      </ul>

      <button
        type="button"
        className={`btn h-11 w-full rounded-button text-[18px] font-extrabold leading-none ${
          progress.isEligible && progress.examPaid ? 'btn-dark' : ''
        }`}
        style={
          progress.isEligible && progress.examPaid
            ? undefined
            : {
                backgroundColor: '#B8C0D1',
                color: '#FFFFFF',
              }
        }
        disabled={!progress.isEligible || !progress.examPaid}
      >
        {examButtonLabel}
      </button>
    </section>
  );
}

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2 text-[15px] leading-none">
      {ok ? (
        <CheckCircle
          size={18}
          strokeWidth={2.4}
          className="shrink-0 text-[var(--color-green-brand)]"
        />
      ) : (
        <XCircle size={18} strokeWidth={2.4} className="shrink-0 text-[var(--color-pink-danger)]" />
      )}

      <span className="font-extrabold text-blue-dark">{label}:</span>
      <span className="text-[#97A0BD]">{value}</span>
    </li>
  );
}

function sumCeu(summary?: CeuSummaryLike['usable']) {
  if (!summary) return 0;

  return (
    Number(summary.ethics ?? 0) +
    Number(summary.cultDiver ?? 0) +
    Number(summary.supervision ?? 0) +
    Number(summary.general ?? 0)
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
