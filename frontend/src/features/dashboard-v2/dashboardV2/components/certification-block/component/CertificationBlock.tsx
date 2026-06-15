// src/features/dashboard-v2/dashboardV2/components/certification-block/component/CertificationBlock.tsx
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

import type { CurrentUser } from '@/features/auth/api/me';
import { isTargetLocked } from '@/features/auth/api/me';
import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { useMyCertificates } from '@/features/certificate/hooks/useMyCertificates';
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useSetTargetLevel } from '@/features/user/hooks/useSetTargetLevel';
import type { TargetLevel as ApiTargetLevel, GoalMode } from '@/features/user/api/setTargetLevel';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useMyExamApp } from '@/features/exam/hooks/useMyExamApp';
import { usePatchExamAppStatus } from '@/features/exam/hooks/usePatchExamAppStatus';
import { examStatusLabels, formatCertificationLevelName } from '@/utils/labels';
import { getServerErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { toast } from 'sonner';

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
  mentor?: {
    total?: number;
    required?: number;
    percent?: number;
    pending?: number;
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
      label: 'Ресертификация: Опытный супервизор',
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
    return 'Опытный супервизор';
  }

  return formatCertificationLevelName(TARGET_LEVEL_LABELS[targetLevel]);
}

function capToRequired(value: number, required: number) {
  if (required <= 0) return Math.max(0, value);
  return Math.min(Math.max(0, value), required);
}

export function CertificationBlock({ user }: Props) {
  const setTarget = useSetTargetLevel(user.id);
  const { data: certificates = [], isLoading: certificatesLoading } = useMyCertificates();
  const { confirm } = useConfirm();

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

  const progress = useQualificationProgress(activeGroupName, targetLevel) as {
    ceuReady?: boolean;
    supervisionReady?: boolean;
    documentsReady?: boolean;
    documentReviewPaid?: boolean;
    requiredPaymentsPaid?: boolean;
    loading?: boolean;
    isEligible?: boolean;
    examPaid?: boolean;
  };

  const ceuSummaryQuery = useCeuSummary(targetLevel);
  const supervisionSummaryQuery = useSupervisionSummary();
  const examAppQuery = useMyExamApp();
  const patchExamApp = usePatchExamAppStatus();

  const loading =
    !!progress.loading ||
    ceuSummaryQuery.isLoading ||
    supervisionSummaryQuery.isLoading ||
    certificatesLoading ||
    examAppQuery.isLoading;

  const locked = isTargetLocked(user);
  const currentTargetLevel = user.targetLevel as ApiTargetLevel | null;
  const currentGoalMode = activeCycleType;

  const serverErr = ((setTarget.error as any)?.response?.data?.errorCode ??
    (setTarget.error as any)?.response?.data?.error) as string | undefined;

  const errorMessage = getServerErrorMessage(serverErr) ?? null;

  const ceuSummary = (ceuSummaryQuery.data ?? null) as CeuSummaryLike | null;
  const supervisionSummary = (supervisionSummaryQuery.data ??
    null) as SupervisionSummaryLike | null;

  const ceuCurrent = sumCeu(ceuSummary?.usable);
  const ceuRequired = sumCeu(ceuSummary?.required);

  const isMentorshipTarget = activeGroupName === 'Супервизор';
  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';
  const supervisionCurrent = isMentorshipTarget
    ? Number(supervisionSummary?.mentor?.total ?? 0)
    : Number(supervisionSummary?.usable?.supervision ?? 0);
  const supervisionRequired = isMentorshipTarget
    ? Number(supervisionSummary?.mentor?.required ?? 24)
    : Number(supervisionSummary?.required?.supervision ?? 0);
  const ceuDisplay = Math.max(0, ceuCurrent);
  const supervisionDisplay = capToRequired(supervisionCurrent, supervisionRequired);
  const supervisionLabel = isMentorshipTarget ? 'Часы менторства' : 'Часы супервизии';

  const examApp = examAppQuery.data;
  const canSubmitExam =
    !!examApp &&
    !!progress.isEligible &&
    !!progress.requiredPaymentsPaid &&
    (examApp.status === 'NOT_SUBMITTED' || examApp.status === 'REJECTED') &&
    !patchExamApp.isPending;

  const examButtonLabel = (() => {
    if (patchExamApp.isPending) return 'Отправляем...';
    if (examApp?.status === 'PENDING') return 'Заявка на рассмотрении';
    if (examApp?.status === 'APPROVED') return 'Заявка одобрена';
    if (!progress.isEligible) return 'Не все условия выполнены';
    if (!progress.requiredPaymentsPaid) return 'Не все оплаты внесены';
    if (examApp?.status === 'REJECTED') return 'Подать заявку повторно';
    return 'Подать заявку на экзамен';
  })();

  const submitExamApplication = () => {
    if (!examApp?.userId) return;

    patchExamApp.mutate(
      { userId: examApp.userId, status: 'PENDING' },
      {
        onSuccess: () => {
          toast.success(UI_TOAST_MESSAGES.exam.requestSent);
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              UI_TOAST_MESSAGES.exam.statusUpdateFailed,
          );
        },
      },
    );
  };

  const selectDisabled = locked || options.length === 0 || setTarget.isPending;

  const triggerGoalSelection = async (option: GoalOption) => {
    const isSameAsCurrent =
      option.targetLevel === currentTargetLevel && option.goalMode === currentGoalMode;

    if (isSameAsCurrent) {
      return;
    }

    const previousSelected = selected;

    setSelected(option.value);

    const isRenewal = option.goalMode === 'RENEWAL';
    const label = option.label;

    const ok = await confirm({
      message: isRenewal
        ? `Вы собираетесь выбрать: «${label}».`
        : `Вы собираетесь выбрать уровень: «${label}».`,
      description: isRenewal
        ? 'После выбора изменить его нельзя, пока не будет завершён текущий цикл.'
        : 'После выбора изменить его нельзя, пока вы не подтвердите установленную квалификацию.',
      confirmLabel: 'Подтвердить',
    });

    if (!ok) {
      setSelected(previousSelected);
      return;
    }

    setTarget.mutate({
      targetLevel: option.targetLevel,
      goalMode: option.goalMode,
    });
  };

  if (loading) {
    return (
      <section className="card-section">
        <p className="dashboard-v2-text text-blue-dark">Загрузка...</p>
      </section>
    );
  }

  if (!targetLevel) {
    return (
      <section className="card-section flex h-full min-h-[340px] w-full flex-col px-5 py-6 shadow-soft">
        <h2 className="dashboard-v2-title mb-5 text-center">
          Сертификация и ресертификация
        </h2>

        <div className="relative mb-5">
          <select
            className="dashboard-v2-label h-[32px] w-full appearance-none rounded-[8px] border-0 bg-[var(--color-blue-dark)] px-4 pr-10 text-center text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={selected}
            onChange={(e) => {
              const value = e.target.value;

              if (!value) {
                setSelected('');
                return;
              }

              const option = options.find((item) => item.value === value);
              if (!option) return;

              triggerGoalSelection(option);
            }}
            disabled={selectDisabled}
            title={
              locked ? 'Сменить можно после повышения уровня или через администратора' : undefined
            }
          >
            <option value="">Выбрать цель сертификации</option>
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

        <div className="dashboard-v2-caption mb-5 space-y-4 text-center text-[#97A0BD]">
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
            <a
              href="https://reestrpap.ru/contacts"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer text-blue-dark underline underline-offset-2"
            >
              обратитесь к администрации
            </a>
          </p>
        </div>

        {errorMessage && (
          <p className="dashboard-v2-text text-center text-[var(--color-danger)]">{errorMessage}</p>
        )}

        {setTarget.isSuccess && !errorMessage && (
          <p className="dashboard-v2-text text-center text-[var(--color-green-brand)]">Цель обновлена</p>
        )}

        <div className="dashboard-v2-label mt-auto flex h-[42px] items-center justify-center rounded-[8px] bg-[#B8C0D1] px-5 text-white">
          Не выбрано
        </div>
      </section>
    );
  }

  return (
    <section className="card-section flex h-full min-h-[340px] w-full flex-col px-5 py-6 shadow-soft">
      <h2 className="dashboard-v2-title mb-5 text-center">
        Планируемый уровень сертификации
      </h2>

      <div className="dashboard-v2-label dashboard-v2-level-pill mb-6">
        {targetLevelName}
      </div>

      <p className="dashboard-v2-caption mb-5 text-center text-[#97A0BD]">
        Выполните условия
        <br />
        целевого уровня сертификации
      </p>

      <ul className="space-y-3">
        <StatusRow
          ok={!!progress.ceuReady}
          label="CEU-Баллы"
          value={`${formatNumber(ceuDisplay)} / ${formatNumber(ceuRequired)}`}
        />

        {!isExperiencedSupervisor ? (
          <StatusRow
            ok={!!progress.supervisionReady}
            label={supervisionLabel}
            value={`${formatNumber(supervisionDisplay)} / ${formatNumber(supervisionRequired)}`}
          />
        ) : null}

        <StatusRow
          ok={!!progress.documentsReady}
          label="Документы"
          value={progress.documentsReady ? 'подтверждено' : 'не подтверждено'}
        />
      </ul>

      {!progress.documentReviewPaid ? (
        <p className="dashboard-v2-small mt-3 text-center text-[var(--color-danger)]">
          Проверка документов не оплачена
        </p>
      ) : null}

      <button
        type="button"
        className={`btn dashboard-v2-label mt-auto h-[42px] w-full rounded-[8px] ${
          canSubmitExam ? 'btn-dark' : ''
        }`}
        style={
          canSubmitExam
            ? undefined
            : {
                backgroundColor: '#B8C0D1',
                color: '#FFFFFF',
              }
        }
        disabled={!canSubmitExam}
        onClick={submitExamApplication}
      >
        {examButtonLabel}
      </button>

      {examApp?.status === 'REJECTED' && examApp.comment ? (
        <p className="dashboard-v2-small mt-2 text-center text-[var(--color-danger)]">
          {examStatusLabels.REJECTED}: {examApp.comment}
        </p>
      ) : null}
    </section>
  );
}

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="dashboard-v2-caption flex min-w-0 items-center gap-2">
      {ok ? (
        <CheckCircle
          size={16}
          strokeWidth={2.4}
          className="shrink-0 text-[var(--color-green-brand)]"
        />
      ) : (
        <XCircle size={16} strokeWidth={2.4} className="shrink-0 text-[var(--color-danger)]" />
      )}

      <span className="font-extrabold text-blue-dark">{label}:</span>
      <span className="min-w-0 truncate text-[#97A0BD]">{value}</span>
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
