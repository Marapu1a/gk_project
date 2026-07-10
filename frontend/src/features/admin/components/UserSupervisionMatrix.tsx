import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useUserSupervisionMatrix } from '../hooks/supervision/useUserSupervisionMatrix';
import { useUpdateUserSupervisionMatrix } from '../hooks/supervision/useUpdateUserSupervisionMatrix';
import { AdminNotifyChoiceModal } from './AdminNotifyChoiceModal';
import { UI_TOAST_MESSAGES } from '../../../utils/uiMessages';
import {
  formatDecimalInput,
  getDecimalInputBlurValue,
  getDecimalInputFocusValue,
  normalizeDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from '@/utils/decimalInput';

type Props = {
  userId: string;
  activeGroupName: string | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clampToMax(value: number, max?: number | null) {
  const normalized = Math.max(0, value);
  if (max == null || max <= 0) return normalized;
  return Math.min(normalized, max);
}

function scalePairToMax(left: number, right: number, max: number) {
  const total = round2(left + right);
  if (max <= 0) return { left: 0, right: 0 };
  if (total <= max) return { left, right };

  const ratio = max / total;
  const scaledLeft = round2(left * ratio);
  return { left: scaledLeft, right: round2(max - scaledLeft) };
}

function scaleDistributionToMax(
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
  },
  max: number,
) {
  const total = round2(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );

  if (max <= 0) {
    return {
      directIndividual: 0,
      directGroup: 0,
      nonObservingIndividual: 0,
      nonObservingGroup: 0,
    };
  }

  if (total <= max) return distribution;

  const ratio = max / total;
  const directIndividual = round2(distribution.directIndividual * ratio);
  const directGroup = round2(distribution.directGroup * ratio);
  const nonObservingIndividual = round2(distribution.nonObservingIndividual * ratio);

  return {
    directIndividual,
    directGroup,
    nonObservingIndividual,
    nonObservingGroup: round2(max - directIndividual - directGroup - nonObservingIndividual),
  };
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '0';
  return formatDecimalInput(value, 2);
}

function sanitizeHoursInput(rawValue: string) {
  return sanitizeDecimalInput(rawValue, { maxDecimals: 2 });
}

function normalizeHoursInput(value: string, max?: number | null) {
  return normalizeDecimalInput(value, { max, maxDecimals: 2 });
}

function parseHours(value: string) {
  const parsed = parseDecimalInput(value);
  if (parsed == null) return 0;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function calcExpectedSupervision(params: {
  practice: number;
  requiredPractice?: number | null;
  requiredSupervision?: number | null;
}) {
  const { practice, requiredPractice, requiredSupervision } = params;
  if (!requiredPractice || !requiredSupervision || requiredPractice <= 0 || requiredSupervision <= 0) {
    return 0;
  }

  const ratio = requiredPractice / requiredSupervision;
  return clampToMax(Math.floor(practice / ratio), requiredSupervision);
}

function getPracticeRuleError(implementingValue: number, programmingValue: number) {
  const total = implementingValue + programmingValue;
  if (total <= 0) return null;

  const minEachType = total * 0.4;
  if (implementingValue < minEachType || programmingValue < minEachType) {
    return 'Часы полевой практики и работы с информацией должны быть распределены сбалансированно: не менее 40% часов — полевая практика и не менее 40% — работа с информацией. Оставшиеся 20% можно добавить к любому из этих двух типов.';
  }

  return null;
}

function getDistributionRuleError(params: {
  expectedSupervision: number;
  distributionTotal: number;
  groupTotal: number;
  distributionRemaining: number;
}) {
  const { expectedSupervision, distributionTotal, groupTotal, distributionRemaining } = params;

  if (expectedSupervision <= 0) {
    if (distributionTotal > 0) {
      return 'Пока расчетная супервизия равна 0, распределять часы супервизии нельзя.';
    }
    return null;
  }

  if (Math.abs(distributionRemaining) >= 0.01) {
    return 'Сумма распределенных часов должна совпадать с расчетной супервизией.';
  }

  if (groupTotal > expectedSupervision * 0.5) {
    return 'Часов в группе может быть не более 50% от всех часов супервизии.';
  }

  return null;
}

export default function UserSupervisionMatrix({ userId, activeGroupName }: Props) {
  const { data, isLoading, error } = useUserSupervisionMatrix(userId);
  const mutation = useUpdateUserSupervisionMatrix(userId);

  const [practiceLocked, setPracticeLocked] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState<'PRACTICE' | 'MENTORSHIP' | null>(null);
  const [implementing, setImplementing] = useState('0');
  const [programming, setProgramming] = useState('0');
  const [directIndividual, setDirectIndividual] = useState('0');
  const [directGroup, setDirectGroup] = useState('0');
  const [nonObservingIndividual, setNonObservingIndividual] = useState('0');
  const [nonObservingGroup, setNonObservingGroup] = useState('0');
  const [mentorshipHours, setMentorshipHours] = useState('0');

  const required = data?.summary.required ?? null;
  const mentor = data?.summary.mentor ?? null;
  const isMentorshipMode = Boolean(mentor && mentor.required > 0 && activeGroupName === 'Супервизор');
  const canEditPractice = Boolean(required && (required.practice > 0 || required.supervision > 0));

  useEffect(() => {
    if (!data) return;

    const breakdown = data.summary.practiceBreakdown;
    const distribution = data.summary.supervisionBreakdown;
    const manualPracticeLimit = Math.max(
      0,
      (data.summary.required?.practice ?? 0) - (breakdown?.bonus ?? data.summary.bonus?.practice ?? 0),
    );
    const practicePair = scalePairToMax(
      (breakdown?.implementing ?? 0) + (breakdown?.legacy ?? 0),
      breakdown?.programming ?? 0,
      manualPracticeLimit,
    );
    const activePracticeTotal = round2(practicePair.left + practicePair.right);
    const expectedActiveSupervision = calcExpectedSupervision({
      practice: activePracticeTotal,
      requiredPractice: data.summary.required?.practice,
      requiredSupervision: data.summary.required?.supervision,
    });
    const cappedDistribution = scaleDistributionToMax(
      {
        directIndividual: distribution?.directIndividual ?? 0,
        directGroup: distribution?.directGroup ?? 0,
        nonObservingIndividual: distribution?.nonObservingIndividual ?? 0,
        nonObservingGroup: distribution?.nonObservingGroup ?? 0,
      },
      expectedActiveSupervision,
    );

    setImplementing(formatNumber(practicePair.left));
    setProgramming(formatNumber(practicePair.right));
    setDirectIndividual(formatNumber(cappedDistribution.directIndividual));
    setDirectGroup(formatNumber(cappedDistribution.directGroup));
    setNonObservingIndividual(formatNumber(cappedDistribution.nonObservingIndividual));
    setNonObservingGroup(formatNumber(cappedDistribution.nonObservingGroup));
    setMentorshipHours(formatNumber(clampToMax(data.summary.mentor?.total ?? data.summary.usable.supervisor ?? 0, data.summary.mentor?.required)));
    setPracticeLocked(false);
  }, [data]);

  const values = useMemo(() => {
    const implementingValue = parseHours(implementing);
    const programmingValue = parseHours(programming);
    const practiceTotalWithoutBonus = round2(implementingValue + programmingValue);
    const bonusPractice = data?.summary.practiceBreakdown?.bonus ?? data?.summary.bonus?.practice ?? 0;
    const legacyPractice = data?.summary.practiceBreakdown?.legacy ?? 0;
    const practiceTotal = round2(practiceTotalWithoutBonus + bonusPractice);
    const expectedSupervision = calcExpectedSupervision({
      practice: practiceTotal,
      requiredPractice: required?.practice,
      requiredSupervision: required?.supervision,
    });
    const expectedActiveSupervision = calcExpectedSupervision({
      practice: practiceTotalWithoutBonus,
      requiredPractice: required?.practice,
      requiredSupervision: required?.supervision,
    });
    const bonusSupervision = round2(Math.max(0, expectedSupervision - expectedActiveSupervision));

    const distribution = {
      directIndividual: parseHours(directIndividual),
      directGroup: parseHours(directGroup),
      nonObservingIndividual: parseHours(nonObservingIndividual),
      nonObservingGroup: parseHours(nonObservingGroup),
    };
    const directTotal = round2(distribution.directIndividual + distribution.directGroup);
    const nonObservingTotal = round2(
      distribution.nonObservingIndividual + distribution.nonObservingGroup,
    );
    const distributionTotal = round2(directTotal + nonObservingTotal);
    const groupTotal = round2(distribution.directGroup + distribution.nonObservingGroup);
    const distributionRemaining = round2(expectedActiveSupervision - distributionTotal);

    return {
      implementingValue,
      programmingValue,
      practiceTotalWithoutBonus,
      practiceTotal,
      bonusPractice,
      legacyPractice,
      expectedSupervision,
      expectedActiveSupervision,
      bonusSupervision,
      distribution,
      directTotal,
      nonObservingTotal,
      distributionTotal,
      groupTotal,
      distributionRemaining,
      mentorshipValue: parseHours(mentorshipHours),
    };
  }, [
    data?.summary.bonus?.practice,
    data?.summary.practiceBreakdown?.bonus,
    data?.summary.practiceBreakdown?.legacy,
    directGroup,
    directIndividual,
    implementing,
    mentorshipHours,
    nonObservingGroup,
    nonObservingIndividual,
    programming,
    required,
  ]);

  const practiceRuleError = getPracticeRuleError(values.implementingValue, values.programmingValue);
  const practiceLimit = required?.practice ?? 0;
  const practiceLimitError =
    practiceLimit > 0 && values.practiceTotal > practiceLimit
      ? `Нельзя указать больше ${formatNumber(practiceLimit)} часов практики для текущего цикла.`
      : null;
  const distributionRuleError = getDistributionRuleError({
    expectedSupervision: values.expectedActiveSupervision,
    distributionTotal: values.distributionTotal,
    groupTotal: values.groupTotal,
    distributionRemaining: values.distributionRemaining,
  });

  const lockPractice = () => {
    if (values.practiceTotalWithoutBonus <= 0) {
      toast.error(UI_TOAST_MESSAGES.supervision.practiceHoursRequired);
      return;
    }

    if (practiceRuleError || practiceLimitError) {
      toast.error(practiceRuleError || practiceLimitError);
      return;
    }

    setPracticeLocked(true);
  };

  const savePractice = async (notifyUser: boolean) => {
    if (!practiceLocked) {
      toast.error(UI_TOAST_MESSAGES.supervision.practiceConfirmFirst);
      return;
    }

    if (practiceRuleError || practiceLimitError) {
      toast.error(practiceRuleError || practiceLimitError);
      return;
    }

    if (distributionRuleError) {
      toast.error(distributionRuleError);
      return;
    }

    try {
      await mutation.mutateAsync({
        mode: 'PRACTICE',
        implementing: values.implementingValue,
        programming: values.programmingValue,
        distribution: values.distribution,
        notifyUser,
      });
      toast.success(
        notifyUser
          ? UI_TOAST_MESSAGES.supervision.adminSavedNotify
          : UI_TOAST_MESSAGES.supervision.adminSavedQuiet,
      );
      setPendingSaveMode(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || UI_TOAST_MESSAGES.supervision.saveHoursFailed);
    }
  };

  const saveMentorship = async (notifyUser: boolean) => {
    if (values.mentorshipValue < 0) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorHoursRequired);
      return;
    }

    if ((mentor?.required ?? 0) > 0 && values.mentorshipValue > (mentor?.required ?? 0)) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorLimitExceeded(formatNumber(mentor?.required)));
      return;
    }

    try {
      await mutation.mutateAsync({
        mode: 'MENTORSHIP',
        value: values.mentorshipValue,
        notifyUser,
      });
      toast.success(
        notifyUser
          ? UI_TOAST_MESSAGES.supervision.adminSavedNotify
          : UI_TOAST_MESSAGES.supervision.adminSavedQuiet,
      );
      setPendingSaveMode(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || UI_TOAST_MESSAGES.supervision.saveMentorshipFailed);
    }
  };

  if (isLoading) return <p className="dashboard-v2-text text-[#6B7894]">Загрузка часов...</p>;
  if (error || !data) {
    return (
      <div className="rounded-[12px] bg-[rgba(255,83,100,0.08)] px-4 py-3 dashboard-v2-text text-[var(--color-danger)]">
        Не удалось загрузить часы. Возможно, у пользователя нет активного цикла.
      </div>
    );
  }

  if (isMentorshipMode) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="dashboard-v2-title">Корректировка часов менторства</h2>
          <p className="dashboard-v2-caption mt-1 text-[#6B7894]">
            Ручная правка подтвержденных часов менторства активного цикла.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MetricCard label="Требуется" value={mentor?.required ?? 0} />
          <label className="flex min-h-[86px] items-center justify-between gap-5 rounded-[10px] bg-[var(--color-blue-soft)] px-5 py-4">
            <span className="min-w-0 text-[16px] font-extrabold leading-[1.2] text-[#1F305E]">
              Подтверждено
            </span>
            <NumberInput
              value={mentorshipHours}
              onChange={setMentorshipHours}
              disabled={mutation.isPending || (mentor?.required ?? 0) <= 0}
              max={mentor?.required ?? 0}
              large
            />
          </label>
        </div>

        <SaveActions
          disabled={mutation.isPending || (mentor?.required ?? 0) <= 0}
          onSave={() => setPendingSaveMode('MENTORSHIP')}
        />
        {pendingSaveMode === 'MENTORSHIP' ? (
          <AdminNotifyChoiceModal
            title="Сохранить менторство?"
            isPending={mutation.isPending}
            onChoose={(notify) => void saveMentorship(notify)}
            onClose={() => setPendingSaveMode(null)}
          />
        ) : null}
      </div>
    );
  }

  if (!canEditPractice) {
    return (
      <div className="rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-3 dashboard-v2-text text-[#1F305E]">
        Для текущего цикла нет часов практики или супервизии, которые нужно корректировать.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="dashboard-v2-title">Корректировка часов практики и супервизии</h2>
        <p className="dashboard-v2-caption mt-1 text-[#6B7894]">
          Сначала заполните и подтвердите практику, затем распределите рассчитанные часы супервизии.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={practiceLocked ? 'space-y-4 opacity-70' : 'space-y-4'}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              label="Всего практики"
              value={values.practiceTotal}
              required={required?.practice ?? 0}
              note={[
                values.bonusPractice > 0 ? `с учетом бонуса ${formatNumber(values.bonusPractice)}` : null,
                values.legacyPractice > 0 ? `из старой версии: ${formatNumber(values.legacyPractice)}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined}
            />
            <MetricCard
              label="Расчетная супервизия"
              value={values.expectedSupervision}
              required={required?.supervision ?? 0}
              note={values.bonusSupervision > 0 ? `из них зачтено ${formatNumber(values.bonusSupervision)}` : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Полевая практика">
              <NumberInput
                value={implementing}
                onChange={setImplementing}
                disabled={practiceLocked || mutation.isPending}
                max={Math.max(0, (required?.practice ?? 0) - values.bonusPractice)}
              />
            </Field>
            <Field label="Работа с информацией">
              <NumberInput
                value={programming}
                onChange={setProgramming}
                disabled={practiceLocked || mutation.isPending}
                max={Math.max(0, (required?.practice ?? 0) - values.bonusPractice)}
              />
            </Field>
          </div>

          {practiceRuleError || practiceLimitError ? (
            <p className="dashboard-v2-caption font-semibold text-[var(--color-danger)]">
              {practiceRuleError || practiceLimitError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={practiceLocked ? () => setPracticeLocked(false) : lockPractice}
            className="btn dashboard-v2-action dashboard-v2-action-secondary"
            disabled={mutation.isPending}
          >
            {practiceLocked ? 'Изменить практику' : 'Подтвердить практику'}
          </button>
        </section>

        <section className={!practiceLocked ? 'pointer-events-none space-y-4 opacity-50' : 'space-y-4'}>
          <div className="rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 dashboard-v2-text text-[#1F305E]">
            {values.bonusPractice > 0 ? (
              <span className="mb-1 block dashboard-v2-caption text-[#6B7894]">
                С уровня «Куратор» зачтено {formatNumber(values.bonusPractice)} часов практики
                {values.bonusSupervision > 0
                  ? ` и ${formatNumber(values.bonusSupervision)} часов супервизии`
                  : ''}
                .
              </span>
            ) : null}
            Распределите <strong>{formatNumber(values.expectedActiveSupervision)}</strong> часов
            супервизии. Осталось:{' '}
            <strong className={values.distributionRemaining === 0 ? undefined : 'text-[var(--color-danger)]'}>
              {formatNumber(values.distributionRemaining)}
            </strong>
            .
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4 sm:border-r sm:border-[#DCE3EF] sm:pr-4">
              <Field label="С наблюдением">
                <input className="input-design h-[32px]" value={formatNumber(values.directTotal)} disabled />
              </Field>
              <Field label="Индивидуально">
                <NumberInput
                  value={directIndividual}
                  onChange={setDirectIndividual}
                  disabled={mutation.isPending}
                  max={values.expectedActiveSupervision}
                />
              </Field>
              <Field label="В группе">
                <NumberInput
                  value={directGroup}
                  onChange={setDirectGroup}
                  disabled={mutation.isPending}
                  max={values.expectedActiveSupervision}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Без наблюдения">
                <input className="input-design h-[32px]" value={formatNumber(values.nonObservingTotal)} disabled />
              </Field>
              <Field label="Индивидуально">
                <NumberInput
                  value={nonObservingIndividual}
                  onChange={setNonObservingIndividual}
                  disabled={mutation.isPending}
                  max={values.expectedActiveSupervision}
                />
              </Field>
              <Field label="В группе">
                <NumberInput
                  value={nonObservingGroup}
                  onChange={setNonObservingGroup}
                  disabled={mutation.isPending}
                  max={values.expectedActiveSupervision}
                />
              </Field>
            </div>
          </div>

          {distributionRuleError ? (
            <div className="rounded-[10px] bg-[#FFF5F6] px-4 py-3 dashboard-v2-caption text-[var(--color-danger)]">
              {distributionRuleError}
            </div>
          ) : null}
        </section>
      </div>

      <SaveActions
        disabled={mutation.isPending || !practiceLocked || Boolean(practiceRuleError || practiceLimitError || distributionRuleError)}
        onSave={() => setPendingSaveMode('PRACTICE')}
      />
      {pendingSaveMode === 'PRACTICE' ? (
        <AdminNotifyChoiceModal
          title="Сохранить часы?"
          isPending={mutation.isPending}
          onChoose={(notify) => void savePractice(notify)}
          onClose={() => setPendingSaveMode(null)}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[13px] font-semibold text-[#1F305E]">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  large = false,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  large?: boolean;
  max?: number | null;
}) {
  const [restoreValue, setRestoreValue] = useState<string | null>(null);

  return (
    <input
      className={
        large
          ? 'h-[38px] w-[96px] rounded-[10px] border border-[#B8C4D8] bg-white px-2 text-right text-[24px] font-extrabold leading-none text-[#1F305E] outline-none transition focus:border-[var(--color-blue-dark)] focus:shadow-[0_0_0_2px_rgba(31,48,94,0.12)] disabled:cursor-not-allowed disabled:border-[#D7DCE7] disabled:bg-[#EEF0F4] disabled:text-[#8D96B5]'
          : 'input-design h-[32px]'
      }
      inputMode="decimal"
      value={value}
      onFocus={() => {
        const next = getDecimalInputFocusValue(value);
        setRestoreValue(next.restoreValue);
        onChange(next.focusedValue);
      }}
      onBlur={() => {
        const rawValue = getDecimalInputBlurValue(value, restoreValue);
        onChange(normalizeHoursInput(rawValue, max));
        setRestoreValue(null);
      }}
      onChange={(event) => {
        const nextValue = sanitizeHoursInput(event.target.value);
        if (nextValue !== null) {
          const parsed = parseHours(nextValue);
          onChange(max != null && parsed > max ? formatNumber(Math.max(0, max)) : nextValue);
        }
      }}
      disabled={disabled}
      max={max ?? undefined}
    />
  );
}

function MetricCard({
  label,
  value,
  required,
  note,
}: {
  label: string;
  value: number;
  required?: number;
  note?: string;
}) {
  const displayValue = required != null ? clampToMax(value, required) : value;

  return (
    <div className="flex min-h-[86px] items-center justify-between gap-5 rounded-[10px] bg-[var(--color-blue-soft)] px-5 py-4">
      <span className="min-w-0 text-[16px] font-extrabold leading-[1.2] text-[#1F305E]">
        {label}
        {note ? <span className="mt-1 block text-[12px] font-semibold text-[#7F8AA3]">{note}</span> : null}
      </span>
      <span className="shrink-0 whitespace-nowrap text-[26px] font-extrabold leading-none text-[#1F305E]">
        {formatNumber(displayValue)}
        {required != null ? (
          <span className="ml-1 text-[14px] font-semibold text-[#7F8AA3]">
            /{formatNumber(required)}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function SaveActions({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end border-t border-[#DCE8EC] pt-4">
      <button
        type="button"
        className="btn dashboard-v2-action dashboard-v2-action-primary"
        disabled={disabled}
        onClick={onSave}
      >
        Сохранить
      </button>
    </div>
  );
}
