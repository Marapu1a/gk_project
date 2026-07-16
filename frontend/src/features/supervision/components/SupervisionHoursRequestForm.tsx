import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useSubmitSupervisionRequest } from '@/features/supervision/hooks/useSubmitSupervisionRequest';
import { useReviewerSuggestions } from '@/features/supervision/hooks/useReviewerSuggestions';
import { LONG_TEXT_MAX_LENGTH } from '@/utils/formLimits';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { CopyEmailLink } from '@/components/CopyEmailLink';
import { SubmissionSuccessModal } from '@/components/SubmissionSuccessModal';
import { SupervisionHoursGuideModal } from './SupervisionHoursGuideModal';
import {
  getDecimalInputBlurValue,
  getDecimalInputFocusValue,
} from '@/utils/decimalInput';
import {
  calculateIncrementalSupervision,
  calculateRemainingHours,
  formatHours as formatNumber,
  getDistributionRuleError,
  getPracticeRuleError,
  normalizeHoursInput,
  parseHours,
  roundHours as round2,
  sanitizeHoursInput,
  summarizeSupervisionDistribution,
} from '@/features/supervision/model/hourCalculations';
import { toAppDateInputValue } from '@/utils/dateFormat';
import { buildPracticeHoursSubmission } from '@/features/supervision/model/supervisionSubmission';

const GUIDE_STORAGE_PREFIX = 'supervision-hours-guide-hidden:v1';
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

type ReviewerSuggestion = {
  id: string;
  fullName: string | null;
  email: string;
  groups?: { name: string }[];
};

export function SupervisionHoursRequestForm({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const mutation = useSubmitSupervisionRequest();
  const { data: user } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
  const { data: summary } = useSupervisionSummary();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [practiceLocked, setPracticeLocked] = useState(false);
  const [supervisionDate, setSupervisionDate] = useState('');
  const [periodStartedAt, setPeriodStartedAt] = useState('');
  const [periodEndedAt, setPeriodEndedAt] = useState('');
  const [treatmentSetting, setTreatmentSetting] = useState('');
  const [implementing, setImplementing] = useState('0');
  const [programming, setProgramming] = useState('0');
  const [directIndividual, setDirectIndividual] = useState('0');
  const [directGroup, setDirectGroup] = useState('0');
  const [nonObservingIndividual, setNonObservingIndividual] = useState('0');
  const [nonObservingGroup, setNonObservingGroup] = useState('0');
  const [description, setDescription] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [selectedSupervisorEmail, setSelectedSupervisorEmail] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideHidden, setIsGuideHidden] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const hasStoredEthicsAcceptance = Boolean(user?.supervisionEthicsAcceptedAt);
  const effectiveEthicsAccepted = hasStoredEthicsAcceptance || ethicsAccepted;
  const guideStorageKey = user?.id ? `${GUIDE_STORAGE_PREFIX}:${user.id}` : null;

  useEffect(() => {
    if (!guideStorageKey) return;
    setIsGuideHidden(window.localStorage.getItem(guideStorageKey) === '1');
  }, [guideStorageKey]);

  useEffect(() => {
    if (user?.supervisionEthicsAcceptedAt) {
      setEthicsAccepted(true);
    }
  }, [user?.supervisionEthicsAcceptedAt]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(supervisorEmail.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [supervisorEmail]);

  const userGroups = user?.groups?.map((group: { name: string }) => group.name) ?? [];
  const isExperiencedSupervisor = userGroups.includes('Опытный Супервизор');

  const { data: usersData, isLoading: isUsersLoading } = useReviewerSuggestions({
    search,
    supervision: 'practice',
    limit: 20,
  });

  const suggestions = useMemo(
    () => (usersData?.users ?? []) as ReviewerSuggestion[],
    [usersData?.users],
  );
  const matchedUsers = useMemo(() => {
    const tokens = tokenize(supervisorEmail);
    if (tokens.length === 0) return [];

    return suggestions.filter((suggestion) => {
      const hay = norm(
        [
          suggestion.fullName,
          suggestion.email,
          ...(suggestion.groups?.map((group) => group.name) ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      );
      return tokens.every((token) => hay.includes(token));
    });
  }, [suggestions, supervisorEmail]);
  const trimmedSupervisorEmail = supervisorEmail.trim();
  const exactSupervisorMatch = useMemo(() => {
    const input = norm(trimmedSupervisorEmail);
    if (!input) return null;
    return suggestions.find((suggestion) => norm(suggestion.email) === input) ?? null;
  }, [suggestions, trimmedSupervisorEmail]);
  const hasResolvedSupervisor = Boolean(
    trimmedSupervisorEmail &&
      ((selectedSupervisorEmail &&
        norm(selectedSupervisorEmail) === norm(trimmedSupervisorEmail)) ||
        exactSupervisorMatch),
  );

  const implementingValue = parseHours(implementing);
  const programmingValue = parseHours(programming);
  const practiceTotal = round2(implementingValue + programmingValue);

  const practiceBase = (summary?.usable.practice ?? 0) + (summary?.pending.practice ?? 0);
  const requiredPractice = summary?.required?.practice ?? 0;
  const confirmedPractice = summary?.usable.practice ?? 0;
  const pendingPractice = summary?.pending.practice ?? 0;
  const isRequirementConfirmed = requiredPractice > 0 && confirmedPractice >= requiredPractice;
  const isRequirementCovered =
    requiredPractice > 0 && confirmedPractice + pendingPractice >= requiredPractice;
  const collapsedLabel = isRequirementConfirmed
    ? 'Необходимое для сертификации количество часов набрано'
    : isRequirementCovered
      ? 'Необходимое количество часов уже отправлено на проверку'
      : 'Добавить часы';
  const practiceLimit =
    calculateRemainingHours(summary?.required?.practice, practiceBase);

  useEffect(() => {
    if (isRequirementCovered) setIsOpen(false);
  }, [isRequirementCovered]);
  const supervisionBase = (summary?.usable.supervision ?? 0) + (summary?.pending.supervision ?? 0);
  const supervisionLimit =
    calculateRemainingHours(summary?.required?.supervision, supervisionBase);
  const expectedSupervision = calculateIncrementalSupervision({
    basePractice: practiceBase,
    addedPractice: practiceTotal,
    requiredPractice: summary?.required?.practice,
    requiredSupervision: summary?.required?.supervision,
    remainingSupervision: supervisionLimit,
  });

  const distribution = {
    directIndividual: parseHours(directIndividual),
    directGroup: parseHours(directGroup),
    nonObservingIndividual: parseHours(nonObservingIndividual),
    nonObservingGroup: parseHours(nonObservingGroup),
  };

  const {
    directTotal,
    nonObservingTotal,
    distributionTotal,
    groupTotal,
    distributionRemaining,
  } = summarizeSupervisionDistribution(distribution, expectedSupervision);
  const today = toAppDateInputValue();
  const practiceRuleError = getPracticeRuleError(implementingValue, programmingValue);
  const practiceLimitError =
    practiceLimit != null && practiceTotal > practiceLimit
      ? `Можно добавить не более ${formatNumber(practiceLimit)} часов практики для текущего цикла.`
      : null;
  const distributionRuleError = getDistributionRuleError({
    expectedSupervision,
    distributionTotal,
    groupTotal,
    distributionRemaining,
  });
  const isDistributionValid = !distributionRuleError;
  const canSubmit =
    practiceLocked &&
    practiceTotal > 0 &&
    !practiceRuleError &&
    !practiceLimitError &&
    isDistributionValid &&
    Boolean(supervisionDate) &&
    hasResolvedSupervisor &&
    effectiveEthicsAccepted &&
    !mutation.isPending;

  const lockPractice = () => {
    if (isExperiencedSupervisor) {
      toast.error(UI_TOAST_MESSAGES.supervision.experiencedSupervisorNoPractice);
      return;
    }

    if (practiceTotal <= 0) {
      toast.error(UI_TOAST_MESSAGES.supervision.practiceHoursRequired);
      return;
    }

    if (practiceRuleError || practiceLimitError) {
      toast.error(practiceRuleError || practiceLimitError);
      return;
    }

    if (!periodStartedAt) {
      toast.error(UI_TOAST_MESSAGES.supervision.startDateRequired);
      return;
    }

    if (!periodEndedAt) {
      toast.error(UI_TOAST_MESSAGES.supervision.endDateRequired);
      return;
    }

    if (periodStartedAt && periodEndedAt && periodEndedAt < periodStartedAt) {
      toast.error(UI_TOAST_MESSAGES.supervision.endBeforeStart);
      return;
    }

    if (!supervisionDate) {
      toast.error(UI_TOAST_MESSAGES.supervision.supervisionDateRequired);
      return;
    }

    if (supervisionDate > today) {
      toast.error(UI_TOAST_MESSAGES.supervision.supervisionDateInFuture);
      return;
    }

    if (periodStartedAt && periodStartedAt > today) {
      toast.error(UI_TOAST_MESSAGES.supervision.startDateInFuture);
      return;
    }

    if (periodEndedAt && periodEndedAt > today) {
      toast.error(UI_TOAST_MESSAGES.supervision.endDateInFuture);
      return;
    }

    setPracticeLocked(true);
  };

  const resetForm = () => {
    setPracticeLocked(false);
    setSupervisionDate('');
    setPeriodStartedAt('');
    setPeriodEndedAt('');
    setTreatmentSetting('');
    setImplementing('0');
    setProgramming('0');
    setDirectIndividual('0');
    setDirectGroup('0');
    setNonObservingIndividual('0');
    setNonObservingGroup('0');
    setDescription('');
    setSupervisorEmail('');
    setSelectedSupervisorEmail('');
    setEthicsAccepted(effectiveEthicsAccepted);
  };

  const hideGuidePermanently = () => {
    if (guideStorageKey) {
      window.localStorage.setItem(guideStorageKey, '1');
    }

    setIsGuideHidden(true);
    setIsGuideOpen(false);
  };

  const submit = async () => {
    if (practiceRuleError || practiceLimitError) {
      toast.error(practiceRuleError || practiceLimitError);
      return;
    }

    if (distributionRuleError) {
      toast.error(distributionRuleError);
      return;
    }

    if (!supervisionDate) {
      toast.error(UI_TOAST_MESSAGES.supervision.supervisionDateRequired);
      return;
    }

    if (!periodStartedAt) {
      toast.error(UI_TOAST_MESSAGES.supervision.startDateRequired);
      return;
    }

    if (!periodEndedAt) {
      toast.error(UI_TOAST_MESSAGES.supervision.endDateRequired);
      return;
    }

    if (!hasResolvedSupervisor) {
      toast.error(UI_TOAST_MESSAGES.supervision.reviewerMustExist);
      return;
    }

    if (!canSubmit) return;

    try {
      await mutation.mutateAsync(buildPracticeHoursSubmission({
        supervisorEmail: exactSupervisorMatch?.email ?? trimmedSupervisorEmail,
        supervisionDate,
        periodStartedAt,
        periodEndedAt,
        treatmentSetting,
        description,
        ethicsAccepted: effectiveEthicsAccepted,
        distribution,
        implementing: implementingValue,
        programming: programmingValue,
      }));

      resetForm();
      setIsOpen(false);
      setIsSuccessOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.supervision.requestSendFailed);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isRequirementCovered) setIsOpen(true);
        }}
        disabled={isRequirementCovered}
        className={`btn w-full rounded-[10px] text-[16px] font-extrabold transition-all duration-300 ease-out ${
          isRequirementCovered
            ? 'cursor-default border border-[#C9D8DD] bg-[#E5EFF1] text-[#1F305E]'
            : 'btn-dark'
        } ${
          isOpen
            ? 'pointer-events-none mt-0 h-0 overflow-hidden opacity-0'
            : 'mt-5 h-[48px] opacity-100'
        }`}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        {collapsedLabel}
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <section className="rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="hidden sm:block" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 text-[16px] font-extrabold text-[#1F305E]"
              >
                Добавить часы
                <img
                  src="/dashboard-v2/btn_hide.svg"
                  alt=""
                  className="h-[21px] w-[21px] cursor-pointer"
                />
              </button>

              {isGuideHidden ? (
                <div className="hidden sm:block" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="justify-self-center rounded-[10px] border border-[#A7B1C7] px-4 py-2 text-[13px] font-extrabold text-[#1F305E] transition-colors hover:bg-[#E7F1F4] sm:justify-self-end"
                >
                  Как заполнить?
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className={practiceLocked ? 'opacity-70' : undefined}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Дата проведения супервизии">
                    <input
                      className="input-design h-[32px]"
                      type="date"
                      max={today}
                      value={supervisionDate}
                      onChange={(event) => setSupervisionDate(event.target.value)}
                      disabled={practiceLocked}
                    />
                  </Field>
                  <Field label="Условия практики">
                    <input
                      className="input-design h-[32px]"
                      value={treatmentSetting}
                      onChange={(event) => setTreatmentSetting(event.target.value)}
                      disabled={practiceLocked}
                      placeholder="Укажите ФИО и место работы"
                    />
                  </Field>
                  <Field label="Дата начала периода практики">
                    <input
                      className="input-design h-[32px]"
                      type="date"
                      max={today}
                      value={periodStartedAt}
                      onChange={(event) => setPeriodStartedAt(event.target.value)}
                      disabled={practiceLocked}
                    />
                  </Field>
                  <Field label="Дата окончания периода практики">
                    <input
                      className="input-design h-[32px]"
                      type="date"
                      max={today}
                      value={periodEndedAt}
                      onChange={(event) => setPeriodEndedAt(event.target.value)}
                      disabled={practiceLocked}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Полевая практика">
                    <NumberInput
                      value={implementing}
                      onChange={setImplementing}
                      disabled={practiceLocked}
                      max={practiceLimit}
                    />
                  </Field>
                  <Field label="Работа с информацией">
                    <NumberInput
                      value={programming}
                      onChange={setProgramming}
                      disabled={practiceLocked}
                      max={practiceLimit}
                    />
                  </Field>
                </div>

                <div className="mt-3 rounded-[10px] bg-[#E7F1F4] px-4 py-3 text-[14px] text-[#1F305E]">
                  Всего практики: <strong>{practiceTotal}</strong>. Расчетная супервизия:{' '}
                  <strong>{expectedSupervision}</strong>.
                </div>

                {practiceRuleError || practiceLimitError ? (
                  <p className="mt-2 text-[13px] font-semibold text-[#FF5364]">
                    {practiceRuleError || practiceLimitError}
                  </p>
                ) : null}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={practiceLocked ? () => setPracticeLocked(false) : lockPractice}
                    className="btn h-[40px] rounded-[10px] border border-[#1F305E] px-5 text-[15px] font-bold text-[#1F305E]"
                  >
                    {practiceLocked ? 'Изменить практику' : 'Подтвердить практику'}
                  </button>
                </div>

                <Field label="Описание" className="mt-5">
                  <textarea
                    className="input-design min-h-[132px] resize-y text-[14px]"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={LONG_TEXT_MAX_LENGTH}
                    placeholder="Кратко опишите практику"
                  />
                </Field>
              </div>

              <div className={!practiceLocked ? 'pointer-events-none opacity-50' : undefined}>
                <div className="mb-3 rounded-[10px] bg-[#E7F1F4] px-4 py-3 text-[14px] text-[#1F305E]">
                  Распределите <strong>{expectedSupervision}</strong> часов супервизии. Осталось:{' '}
                  <strong className={distributionRemaining === 0 ? undefined : 'text-error'}>
                    {distributionRemaining}
                  </strong>
                  .
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-4 sm:border-r sm:border-[#DCE3EF] sm:pr-4">
                    <Field label="С наблюдением">
                      <input className="input-design h-[32px]" value={directTotal} disabled />
                    </Field>

                    <Field label="Индивидуально">
                      <NumberInput
                        value={directIndividual}
                        onChange={setDirectIndividual}
                        max={expectedSupervision}
                      />
                    </Field>

                    <Field label="В группе">
                      <NumberInput
                        value={directGroup}
                        onChange={setDirectGroup}
                        max={expectedSupervision}
                      />
                    </Field>
                  </div>

                  <div className="space-y-4">
                    <Field label="Без наблюдения">
                      <input className="input-design h-[32px]" value={nonObservingTotal} disabled />
                    </Field>

                    <Field label="Индивидуально">
                      <NumberInput
                        value={nonObservingIndividual}
                        onChange={setNonObservingIndividual}
                        max={expectedSupervision}
                      />
                    </Field>

                    <Field label="В группе">
                      <NumberInput
                        value={nonObservingGroup}
                        onChange={setNonObservingGroup}
                        max={expectedSupervision}
                      />
                    </Field>
                  </div>
                </div>

                {distributionRuleError ? (
                  <div className="mt-3 rounded-[10px] bg-white px-4 py-3 text-[13px] text-[#1F305E] shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
                    <p className="mb-2 font-extrabold text-[#FF5364]">
                      Ошибка возможных пропорций часов
                    </p>
                    <p>{distributionRuleError}</p>
                    <p className="mt-2">100% часов могут быть индивидуальными.</p>
                  </div>
                ) : null}

                <Field label="Супервизор" className="relative mt-5">
                  <input
                    className="input-design h-[36px]"
                    value={supervisorEmail}
                    onChange={(event) => {
                      setSupervisorEmail(event.target.value);
                      setSelectedSupervisorEmail('');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (supervisorEmail.trim()) setShowSuggestions(true);
                    }}
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Начните вводить ФИО или email"
                    autoComplete="off"
                  />

                  {showSuggestions && supervisorEmail.trim() && matchedUsers.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] bg-white shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                      {matchedUsers.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full border-b border-[#DCE8EC] px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#F5F8FA]"
                          onClick={() => {
                            setSupervisorEmail(suggestion.email);
                            setSelectedSupervisorEmail(suggestion.email);
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="block font-semibold text-[#1F305E]">
                            {suggestion.fullName || 'Без имени'}
                          </span>
                          <span className="block text-[#6B7894]">{suggestion.email}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showSuggestions &&
                  supervisorEmail.trim() &&
                  !isUsersLoading &&
                  matchedUsers.length === 0 ? (
                    <div className="absolute z-20 mt-1 w-full rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#6B7894] shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                      Супервизор не найден в системе.
                    </div>
                  ) : null}
                </Field>

                {trimmedSupervisorEmail && !hasResolvedSupervisor ? (
                  <p className="mt-2 text-[13px] font-semibold leading-[1.35] text-[#FF5364]">
                    Выберите супервизора из подсказки.
                  </p>
                ) : null}

                <p className="mt-3 text-center text-[13px] leading-[1.35] text-[#6B7894]">
                  Если вашего супервизора нет в реестре, напишите{' '}
                  <CopyEmailLink
                    email="cspap@yandex.ru"
                    className="font-semibold text-[#1F305E] underline"
                  >
                    cspap@yandex.ru
                  </CopyEmailLink>
                </p>

                <label className="mt-5 flex items-start gap-3 text-[13px] text-[#6B7894]">
                  <input
                    type="checkbox"
                    checked={effectiveEthicsAccepted}
                    onChange={(event) => setEthicsAccepted(event.target.checked)}
                    disabled={hasStoredEthicsAcceptance}
                    className="mt-0.5 h-5 w-5 rounded border-[#A7B1C7]"
                  />
                  <span>
                    Ознакомлен и обязуюсь соблюдать{' '}
                    <a
                      className="font-semibold text-[#1F305E] underline"
                      href="https://theibao.com/documents/ethical-guidelines?language=Russian"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Этические принципы IBAO
                    </a>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="btn btn-dark mt-5 h-[48px] w-full rounded-[10px] text-[16px] font-extrabold disabled:cursor-not-allowed disabled:bg-[#B7BFCE]"
                >
                  {mutation.isPending ? 'Отправляем...' : 'Отправить'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isGuideOpen ? (
        <SupervisionHoursGuideModal
          onClose={() => setIsGuideOpen(false)}
          onHidePermanently={hideGuidePermanently}
        />
      ) : null}

      <SubmissionSuccessModal
        open={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Заявка на подтверждение часов практики отправлена"
        description="Заявка добавлена в историю. После проверки здесь появится её статус."
      />
    </>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-[13px] font-semibold text-[#1F305E] ${className}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  max?: number | null;
}) {
  const [restoreValue, setRestoreValue] = useState<string | null>(null);

  return (
    <input
      className="input-design h-[32px]"
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
