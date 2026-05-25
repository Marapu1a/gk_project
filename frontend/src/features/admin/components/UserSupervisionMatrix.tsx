import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useUserSupervisionMatrix } from '../hooks/supervision/useUserSupervisionMatrix';
import { useUpdateUserSupervisionMatrix } from '../hooks/supervision/useUpdateUserSupervisionMatrix';

type Props = {
  userId: string;
  activeGroupName: string | null;
};

const hoursInputPattern = /^\d*(?:[.]\d{0,2})?$/;

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
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sanitizeHoursInput(rawValue: string) {
  const value = rawValue.replace(/\s/g, '').replace(',', '.');
  return hoursInputPattern.test(value) ? value : null;
}

function normalizeHoursInput(value: string, max?: number | null) {
  const sanitized = sanitizeHoursInput(value);
  if (!sanitized || sanitized === '.') return '0';

  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed) || parsed < 0) return '0';

  if (max != null) {
    return String(round2(Math.min(parsed, Math.max(0, max))));
  }

  return String(round2(parsed));
}

function parseHours(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getPracticeRuleError(implementingValue: number, programmingValue: number) {
  const total = implementingValue + programmingValue;
  if (total <= 0) return null;

  const minEachType = total * 0.4;
  if (implementingValue < minEachType || programmingValue < minEachType) {
    return 'Часы полевой практики и работы с информацией должны быть в пропорции 40/40. Оставшиеся 20% можно отдать любому из двух типов.';
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
  const { confirm } = useConfirm();

  const [practiceLocked, setPracticeLocked] = useState(false);
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
    const cappedDistribution = scaleDistributionToMax(
      {
        directIndividual: distribution?.directIndividual ?? 0,
        directGroup: distribution?.directGroup ?? 0,
        nonObservingIndividual: distribution?.nonObservingIndividual ?? 0,
        nonObservingGroup: distribution?.nonObservingGroup ?? 0,
      },
      data.summary.required?.supervision ?? 0,
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
    const practiceTotal = round2(practiceTotalWithoutBonus + bonusPractice);
    const ratio =
      required && required.practice > 0 && required.supervision > 0
        ? required.practice / required.supervision
        : null;
    const rawExpectedSupervision = ratio ? Math.floor(practiceTotal / ratio) : 0;
    const expectedSupervision = clampToMax(rawExpectedSupervision, required?.supervision ?? null);

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
    const distributionRemaining = round2(expectedSupervision - distributionTotal);

    return {
      implementingValue,
      programmingValue,
      practiceTotalWithoutBonus,
      practiceTotal,
      bonusPractice,
      expectedSupervision,
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
    expectedSupervision: values.expectedSupervision,
    distributionTotal: values.distributionTotal,
    groupTotal: values.groupTotal,
    distributionRemaining: values.distributionRemaining,
  });

  const lockPractice = () => {
    if (values.practiceTotalWithoutBonus <= 0) {
      toast.error('Укажите часы полевой практики или работы с информацией.');
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
      toast.error('Сначала подтвердите левую часть с часами практики');
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

    const ok = await confirm({
      title: 'Сохранить часы?',
      message: notifyUser
        ? 'Сохранить корректировку часов и отправить пользователю уведомление?'
        : 'Сохранить корректировку часов без уведомления пользователя?',
      confirmLabel: notifyUser ? 'Сохранить и уведомить' : 'Сохранить тихо',
      variant: notifyUser ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      await mutation.mutateAsync({
        mode: 'PRACTICE',
        implementing: values.implementingValue,
        programming: values.programmingValue,
        distribution: values.distribution,
        notifyUser,
      });
      toast.success(notifyUser ? 'Часы сохранены, уведомление отправлено' : 'Часы сохранены тихо');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось сохранить часы');
    }
  };

  const saveMentorship = async (notifyUser: boolean) => {
    if (values.mentorshipValue < 0) {
      toast.error('Введите корректное количество часов менторства');
      return;
    }

    if ((mentor?.required ?? 0) > 0 && values.mentorshipValue > (mentor?.required ?? 0)) {
      toast.error(`Нельзя указать больше ${formatNumber(mentor?.required)} часов менторства`);
      return;
    }

    const ok = await confirm({
      title: 'Сохранить менторство?',
      message: notifyUser
        ? 'Сохранить часы менторства и отправить пользователю уведомление?'
        : 'Сохранить часы менторства без уведомления пользователя?',
      confirmLabel: notifyUser ? 'Сохранить и уведомить' : 'Сохранить тихо',
      variant: notifyUser ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      await mutation.mutateAsync({
        mode: 'MENTORSHIP',
        value: values.mentorshipValue,
        notifyUser,
      });
      toast.success(
        notifyUser ? 'Часы менторства сохранены, уведомление отправлено' : 'Часы менторства сохранены тихо',
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Не удалось сохранить часы менторства');
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

        <div className="grid gap-4 md:grid-cols-2">
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
          onSilent={() => void saveMentorship(false)}
          onNotify={() => void saveMentorship(true)}
        />
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={practiceLocked ? 'space-y-4 opacity-70' : 'space-y-4'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Всего практики"
              value={values.practiceTotal}
              required={required?.practice ?? 0}
              note={values.bonusPractice > 0 ? `с учетом бонуса ${formatNumber(values.bonusPractice)}` : undefined}
            />
            <MetricCard
              label="Расчетная супервизия"
              value={values.expectedSupervision}
              required={required?.supervision ?? 0}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            Распределите <strong>{formatNumber(values.expectedSupervision)}</strong> часов
            супервизии. Осталось:{' '}
            <strong className={values.distributionRemaining === 0 ? undefined : 'text-[var(--color-danger)]'}>
              {formatNumber(values.distributionRemaining)}
            </strong>
            .
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 sm:border-r sm:border-[#DCE3EF] sm:pr-4">
              <Field label="С наблюдением">
                <input className="input-design h-[32px]" value={formatNumber(values.directTotal)} disabled />
              </Field>
              <Field label="Индивидуально">
                <NumberInput
                  value={directIndividual}
                  onChange={setDirectIndividual}
                  disabled={mutation.isPending}
                  max={values.expectedSupervision}
                />
              </Field>
              <Field label="В группе">
                <NumberInput
                  value={directGroup}
                  onChange={setDirectGroup}
                  disabled={mutation.isPending}
                  max={values.expectedSupervision}
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
                  max={values.expectedSupervision}
                />
              </Field>
              <Field label="В группе">
                <NumberInput
                  value={nonObservingGroup}
                  onChange={setNonObservingGroup}
                  disabled={mutation.isPending}
                  max={values.expectedSupervision}
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
        onSilent={() => void savePractice(false)}
        onNotify={() => void savePractice(true)}
      />
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
        if (value === '0') onChange('');
      }}
      onBlur={() => onChange(normalizeHoursInput(value, max))}
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
  onSilent,
  onNotify,
}: {
  disabled: boolean;
  onSilent: () => void;
  onNotify: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#DCE8EC] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="dashboard-v2-caption text-[#6B7894]">
        Сохранение заменяет подтвержденные часы активного цикла служебной корректировкой.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="btn dashboard-v2-action dashboard-v2-action-secondary"
          disabled={disabled}
          onClick={onSilent}
        >
          Сохранить тихо
        </button>
        <button
          type="button"
          className="btn dashboard-v2-action dashboard-v2-action-primary"
          disabled={disabled}
          onClick={onNotify}
        >
          Сохранить и уведомить
        </button>
      </div>
    </div>
  );
}
