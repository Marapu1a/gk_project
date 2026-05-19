import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useSubmitSupervisionRequest } from '@/features/supervision/hooks/useSubmitSupervisionRequest';
import { useReviewerSuggestions } from '@/features/supervision/hooks/useReviewerSuggestions';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const GUIDE_STORAGE_PREFIX = 'supervision-hours-guide-hidden:v1';
const hoursInputSchema = z.string().refine(
  (value) => value === '' || /^\d*(?:[.]\d{0,2})?$/.test(value),
  'Введите неотрицательное число',
);

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

function parseHours(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeHoursInput(rawValue: string) {
  const value = rawValue.replace(/\s/g, '').replace(',', '.');
  return hoursInputSchema.safeParse(value).success ? value : null;
}

function normalizeHoursInput(value: string) {
  const sanitized = sanitizeHoursInput(value);
  if (!sanitized || sanitized === '.') return '0';

  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed) || parsed < 0) return '0';

  return String(round2(parsed));
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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

type ReviewerSuggestion = {
  id: string;
  fullName: string | null;
  email: string;
  groups?: { name: string }[];
};

export function SupervisionHoursRequestForm({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const mutation = useSubmitSupervisionRequest();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
  const { data: summary } = useSupervisionSummary();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [practiceLocked, setPracticeLocked] = useState(false);
  const [submittedAt] = useState(todayInputValue);
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
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideHidden, setIsGuideHidden] = useState(false);

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

  const suggestions = (usersData?.users ?? []) as ReviewerSuggestion[];
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

  const implementingValue = parseHours(implementing);
  const programmingValue = parseHours(programming);
  const practiceTotal = round2(implementingValue + programmingValue);

  const practiceBase = (summary?.usable.practice ?? 0) + (summary?.pending.practice ?? 0);
  const ratio =
    summary?.required && summary.required.supervision > 0
      ? summary.required.practice / summary.required.supervision
      : null;

  const expectedSupervision = ratio
    ? Math.max(0, Math.floor((practiceBase + practiceTotal) / ratio) - Math.floor(practiceBase / ratio))
    : 0;

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
  const practiceRuleError = getPracticeRuleError(implementingValue, programmingValue);
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
    isDistributionValid &&
    supervisorEmail.trim().length > 0 &&
    ethicsAccepted &&
    !mutation.isPending;

  const lockPractice = () => {
    if (isExperiencedSupervisor) {
      toast.error('Опытные супервизоры не набирают часы практики.');
      return;
    }

    if (practiceTotal <= 0) {
      toast.error('Укажите часы полевой практики или работы с информацией.');
      return;
    }

    if (practiceRuleError) {
      toast.error(practiceRuleError);
      return;
    }

    if (periodStartedAt && periodEndedAt && periodEndedAt < periodStartedAt) {
      toast.error('Дата окончания не может быть раньше даты начала.');
      return;
    }

    const today = todayInputValue();
    if (periodStartedAt && periodStartedAt > today) {
      toast.error('Дата начала не может быть в будущем.');
      return;
    }

    if (periodEndedAt && periodEndedAt > today) {
      toast.error('Дата окончания не может быть в будущем.');
      return;
    }

    setPracticeLocked(true);
  };

  const resetForm = () => {
    setPracticeLocked(false);
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
    setEthicsAccepted(false);
  };

  const hideGuidePermanently = () => {
    if (guideStorageKey) {
      window.localStorage.setItem(guideStorageKey, '1');
    }

    setIsGuideHidden(true);
    setIsGuideOpen(false);
  };

  const submit = async () => {
    if (practiceRuleError) {
      toast.error(practiceRuleError);
      return;
    }

    if (distributionRuleError) {
      toast.error(distributionRuleError);
      return;
    }

    if (!canSubmit) return;

    const entries = [
      { type: 'IMPLEMENTING' as const, value: implementingValue },
      { type: 'PROGRAMMING' as const, value: programmingValue },
    ].filter((entry) => entry.value > 0);

    try {
      await mutation.mutateAsync({
        supervisorEmail: supervisorEmail.trim(),
        periodStartedAt: periodStartedAt || undefined,
        periodEndedAt: periodEndedAt || undefined,
        treatmentSetting: treatmentSetting.trim() || undefined,
        description: description.trim() || undefined,
        ethicsAccepted,
        draftDistribution: distribution,
        entries,
      });

      toast.success('Заявка отправлена');
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ошибка отправки заявки');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`btn btn-dark w-full rounded-[10px] text-[16px] font-extrabold transition-all duration-300 ease-out ${
          isOpen
            ? 'pointer-events-none mt-0 h-0 overflow-hidden opacity-0'
            : 'mt-5 h-[48px] opacity-100'
        }`}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        Добавить часы
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <section className="rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
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

            <div className="grid gap-5 lg:grid-cols-2">
          <div className={practiceLocked ? 'opacity-70' : undefined}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Дата подачи заявки">
                <input className="input-design h-[32px]" type="date" value={submittedAt} disabled />
              </Field>
              <Field label="Условия практики">
                <input
                  className="input-design h-[32px]"
                  value={treatmentSetting}
                  onChange={(event) => setTreatmentSetting(event.target.value)}
                  disabled={practiceLocked}
                  placeholder="кто / где"
                />
              </Field>
              <Field label="Дата начала">
                <input
                  className="input-design h-[32px]"
                  type="date"
                  max={submittedAt}
                  value={periodStartedAt}
                  onChange={(event) => setPeriodStartedAt(event.target.value)}
                  disabled={practiceLocked}
                />
              </Field>
              <Field label="Дата окончания">
                <input
                  className="input-design h-[32px]"
                  type="date"
                  max={submittedAt}
                  value={periodEndedAt}
                  onChange={(event) => setPeriodEndedAt(event.target.value)}
                  disabled={practiceLocked}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Полевая практика">
                <NumberInput
                  value={implementing}
                  onChange={setImplementing}
                  disabled={practiceLocked}
                />
              </Field>
              <Field label="Работа с информацией">
                <NumberInput
                  value={programming}
                  onChange={setProgramming}
                  disabled={practiceLocked}
                />
              </Field>
            </div>

            <div className="mt-3 rounded-[10px] bg-[#E7F1F4] px-4 py-3 text-[14px] text-[#1F305E]">
              Всего практики: <strong>{practiceTotal}</strong>. Расчетная супервизия:{' '}
              <strong>{expectedSupervision}</strong>.
            </div>

            {practiceRuleError ? (
              <p className="mt-2 text-[13px] font-semibold text-[#FF5364]">{practiceRuleError}</p>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4 sm:border-r sm:border-[#DCE3EF] sm:pr-4">
                <Field label="С наблюдением">
                  <input className="input-design h-[32px]" value={directTotal} disabled />
                </Field>

                <Field label="Индивидуально">
                  <NumberInput value={directIndividual} onChange={setDirectIndividual} />
                </Field>

                <Field label="В группе">
                  <NumberInput value={directGroup} onChange={setDirectGroup} />
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
                  />
                </Field>

                <Field label="В группе">
                  <NumberInput value={nonObservingGroup} onChange={setNonObservingGroup} />
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
                  Пользователь не найден. Можно ввести email вручную.
                </div>
              ) : null}
            </Field>

            <label className="mt-5 flex items-start gap-3 text-[13px] text-[#6B7894]">
              <input
                type="checkbox"
                checked={ethicsAccepted}
                onChange={(event) => setEthicsAccepted(event.target.checked)}
                disabled={Boolean(user?.supervisionEthicsAcceptedAt)}
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

            <p className="mt-3 text-center text-[13px] leading-[1.35] text-[#6B7894]">
              Если вашего супервизора нет в реестре, напишите{' '}
              <a
                href="mailto:cspap@yandex.ru"
                className="font-semibold text-[#1F305E] underline"
              >
                cspap@yandex.ru
              </a>
            </p>
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
    </>
  );
}

function SupervisionHoursGuideModal({
  onClose,
  onHidePermanently,
}: {
  onClose: () => void;
  onHidePermanently: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const close = () => {
    if (dontShowAgain) {
      onHidePermanently();
      return;
    }

    onClose();
  };

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervision-hours-guide-title"
        className="relative max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[16px] bg-white px-5 pb-5 pt-4 text-[#1F305E] shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:px-7 sm:pb-7"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center opacity-65 transition hover:opacity-100"
          aria-label="Закрыть"
        >
          <img src={EXIT_ICON} alt="" className="h-6 w-6" />
        </button>

        <h2
          id="supervision-hours-guide-title"
          className="pr-9 text-center text-[22px] font-extrabold leading-tight sm:text-[24px]"
        >
          Как правильно внести часы
        </h2>

        <ol className="mt-6 space-y-4 text-[14px] leading-[1.55]">
          <GuideStep title="Укажите период практики">
            <p>
              Внесите дату начала и дату окончания периода, за который вы подаете часы. Можно
              указывать только уже прошедшую практику. Даты из будущего система не примет.
            </p>
          </GuideStep>

          <GuideStep title="Заполните условия практики">
            <p>
              В поле <strong>Условия практики</strong> кратко напишите, где или в каком формате
              проходила практика: центр, проект, клиентская работа, школа, организация или другой
              понятный контекст.
            </p>
          </GuideStep>

          <GuideStep title="Разделите часы практики">
            <p>
              В форме есть два типа практики: <strong>Полевая практика</strong> и{' '}
              <strong>Работа с информацией</strong>. Общее количество часов практики считается как
              сумма этих двух полей.
            </p>
            <p className="mt-2">
              Каждый тип должен быть <strong>не меньше 40% от общего количества часов практики</strong>.
              Например, если всего вы вносите 100 часов практики, то полевая практика должна быть не
              меньше 40 часов, и работа с информацией тоже должна быть не меньше 40 часов.
            </p>
            <p className="mt-2">
              Оставшиеся 20% можно добавить к любому из двух типов: например 60/40, 50/50 или 40/60.
            </p>
          </GuideStep>

          <GuideStep title="Подтвердите практику">
            <p>
              После заполнения левой части нажмите <strong>Подтвердить практику</strong>. Форма
              посчитает общее количество практики и расчетные часы супервизии. После этого откроется
              правая часть формы.
            </p>
          </GuideStep>

          <GuideStep title="Распределите часы супервизии">
            <p>
              Справа нужно распределить расчетные часы супервизии по полям с наблюдением, без
              наблюдения, индивидуально и в группе. Сумма всех распределенных часов должна точно
              совпадать с расчетной супервизией.
            </p>
            <p className="mt-2">
              Часов <strong>В группе</strong> может быть не больше 50% от всей супервизии. При этом
              100% супервизии можно указать как индивидуальную.
            </p>
          </GuideStep>

          <GuideStep title="Укажите супервизора">
            <p>
              Начните вводить ФИО или email супервизора. Если супервизор есть в системе, появится
              подсказка. Если подсказка не появилась, можно ввести email вручную.
            </p>
          </GuideStep>

          <GuideStep title="Подтвердите этические принципы и отправьте">
            <p>
              Перед отправкой отметьте чекбокс об ознакомлении с этическими принципами IBAO. Кнопка{' '}
              <strong>Отправить</strong> станет доступной, когда все обязательные поля заполнены
              правильно.
            </p>
          </GuideStep>
        </ol>

        <div className="mt-5 rounded-[12px] bg-[#E7F1F4] px-4 py-3 text-[14px] leading-[1.45]">
          <strong>Важно:</strong> если система не дает отправить заявку, проверьте пропорцию 40/40,
          сумму распределенной супервизии, лимит групповых часов и выбранного супервизора.
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-[14px] text-[#6B7894]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="h-5 w-5 rounded border-[#A7B1C7]"
            />
            <span>Больше не показывать</span>
          </label>

          <button
            type="button"
            onClick={close}
            className="btn btn-dark h-[46px] rounded-[10px] px-8 text-[15px] font-extrabold"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function GuideStep({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-[12px] border border-[#DCE8EC] bg-white px-4 py-3">
      <h3 className="mb-1 text-[15px] font-extrabold">{title}</h3>
      <div className="text-[#26396E]">{children}</div>
    </li>
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
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      className="input-design h-[32px]"
      inputMode="decimal"
      value={value}
      onFocus={() => {
        if (value === '0') onChange('');
      }}
      onBlur={() => onChange(normalizeHoursInput(value))}
      onChange={(event) => {
        const nextValue = sanitizeHoursInput(event.target.value);
        if (nextValue !== null) onChange(nextValue);
      }}
      disabled={disabled}
    />
  );
}
