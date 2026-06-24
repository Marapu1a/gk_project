import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchCurrentUser } from '@/features/auth/api/me';
import { useReviewerSuggestions } from '../hooks/useReviewerSuggestions';
import { useSubmitSupervisionRequest } from '../hooks/useSubmitSupervisionRequest';
import { useSupervisionSummary } from '../hooks/useSupervisionSummary';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { CopyEmailLink } from '@/components/CopyEmailLink';
import {
  formatDecimalInput,
  getDecimalInputBlurValue,
  getDecimalInputFocusValue,
  normalizeDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from '@/utils/decimalInput';

const MENTORSHIP_FORMATS = ['Очно', 'По телефону', 'Дистанционно / онлайн'] as const;

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
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

type ReviewerSuggestion = {
  id: string;
  fullName: string | null;
  email: string;
  groups?: { name: string }[];
};

export function MentorshipHoursRequestForm({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const mutation = useSubmitSupervisionRequest();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
  const { data: summary } = useSupervisionSummary();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mentorshipDate, setMentorshipDate] = useState(todayInputValue);
  const [mentorshipHours, setMentorshipHours] = useState('0');
  const [mentorEmail, setMentorEmail] = useState('');
  const [selectedMentorEmail, setSelectedMentorEmail] = useState('');
  const [format, setFormat] = useState<(typeof MENTORSHIP_FORMATS)[number] | ''>('');
  const [comment, setComment] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const hasStoredEthicsAcceptance = Boolean(user?.supervisionEthicsAcceptedAt);
  const effectiveEthicsAccepted = hasStoredEthicsAcceptance || ethicsAccepted;

  useEffect(() => {
    if (user?.supervisionEthicsAcceptedAt) {
      setEthicsAccepted(true);
    }
  }, [user?.supervisionEthicsAcceptedAt]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(mentorEmail.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [mentorEmail]);

  const { data: usersData, isLoading: isUsersLoading } = useReviewerSuggestions({
    search,
    supervision: 'mentor',
    limit: 20,
  });

  const suggestions = (usersData?.users ?? []) as ReviewerSuggestion[];
  const matchedUsers = useMemo(() => {
    const tokens = tokenize(mentorEmail);
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
  }, [suggestions, mentorEmail]);
  const trimmedMentorEmail = mentorEmail.trim();
  const exactMentorMatch = useMemo(() => {
    const input = norm(trimmedMentorEmail);
    if (!input) return null;
    return suggestions.find((suggestion) => norm(suggestion.email) === input) ?? null;
  }, [suggestions, trimmedMentorEmail]);
  const hasResolvedMentor = Boolean(
    trimmedMentorEmail &&
      ((selectedMentorEmail && norm(selectedMentorEmail) === norm(trimmedMentorEmail)) ||
        exactMentorMatch),
  );

  const hoursValue = parseHours(mentorshipHours);
  const mentor = summary?.mentor ?? null;
  const isRequirementConfirmed = Boolean(
    mentor && mentor.required > 0 && mentor.total >= mentor.required,
  );
  const isRequirementCovered = Boolean(
    mentor && mentor.required > 0 && mentor.total + mentor.pending >= mentor.required,
  );
  const collapsedLabel = isRequirementConfirmed
    ? 'Необходимое для сертификации количество часов менторства набрано'
    : isRequirementCovered
      ? 'Необходимое количество часов менторства уже отправлено на проверку'
      : 'Добавить часы менторства';
  const remaining =
    mentor && mentor.required > 0
      ? Math.max(0, round2(mentor.required - mentor.total - mentor.pending))
      : null;

  useEffect(() => {
    if (isRequirementCovered) setIsOpen(false);
  }, [isRequirementCovered]);
  const effectiveLimit = remaining == null ? null : Math.max(0, remaining);
  const today = todayInputValue();
  const canSubmit =
    mentorshipDate.length > 0 &&
    mentorshipDate <= today &&
    hoursValue > 0 &&
    (effectiveLimit == null || hoursValue <= effectiveLimit) &&
    hasResolvedMentor &&
    format.length > 0 &&
    effectiveEthicsAccepted &&
    !mutation.isPending;

  const resetForm = () => {
    setMentorshipDate(todayInputValue());
    setMentorshipHours('0');
    setMentorEmail('');
    setSelectedMentorEmail('');
    setFormat('');
    setComment('');
    setEthicsAccepted(effectiveEthicsAccepted);
  };

  const submit = async () => {
    if (mentorshipDate > today) {
      toast.error(UI_TOAST_MESSAGES.supervision.startDateInFuture);
      return;
    }

    if (hoursValue <= 0) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorHoursRequired);
      return;
    }

    if (effectiveLimit != null && hoursValue > effectiveLimit) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorLimitExceeded(String(effectiveLimit)));
      return;
    }

    if (!format) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorFormatRequired);
      return;
    }

    if (!hasResolvedMentor) {
      toast.error(UI_TOAST_MESSAGES.supervision.mentorMustExist);
      return;
    }

    if (!canSubmit) return;

    try {
      await mutation.mutateAsync({
        supervisorEmail: exactMentorMatch?.email ?? trimmedMentorEmail,
        periodStartedAt: mentorshipDate,
        periodEndedAt: mentorshipDate,
        treatmentSetting: format,
        description: comment.trim() || undefined,
        ethicsAccepted: effectiveEthicsAccepted,
        entries: [{ type: 'SUPERVISOR', value: hoursValue }],
      });

      toast.success(UI_TOAST_MESSAGES.supervision.mentorshipRequestSent);
      resetForm();
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
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mx-auto mb-5 flex items-center justify-center gap-2 text-[16px] font-extrabold text-[#1F305E]"
            >
              Часы менторства
              <img
                src="/dashboard-v2/btn_hide.svg"
                alt=""
                className="h-[21px] w-[21px] cursor-pointer"
              />
            </button>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Дата">
                    <input
                      className="input-design h-[32px]"
                      type="date"
                      max={today}
                      value={mentorshipDate}
                      onChange={(event) => setMentorshipDate(event.target.value)}
                    />
                  </Field>

                  <Field label="Количество часов менторства">
                    <NumberInput
                      value={mentorshipHours}
                      onChange={setMentorshipHours}
                      max={effectiveLimit}
                    />
                  </Field>
                </div>

                <Field label="Наставник (ментор)" className="relative mt-4">
                  <input
                    className="input-design h-[36px]"
                    value={mentorEmail}
                    onChange={(event) => {
                      setMentorEmail(event.target.value);
                      setSelectedMentorEmail('');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (mentorEmail.trim()) setShowSuggestions(true);
                    }}
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Начните вводить ФИО или email"
                    autoComplete="off"
                  />

                  {showSuggestions && mentorEmail.trim() && matchedUsers.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] bg-white shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                      {matchedUsers.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full border-b border-[#DCE8EC] px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#F5F8FA]"
                          onClick={() => {
                            setMentorEmail(suggestion.email);
                            setSelectedMentorEmail(suggestion.email);
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
                  mentorEmail.trim() &&
                  !isUsersLoading &&
                  matchedUsers.length === 0 ? (
                    <div className="absolute z-20 mt-1 w-full rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#6B7894] shadow-[0_2px_12px_rgba(31,48,94,0.16)]">
                      Наставник не найден в системе.
                    </div>
                  ) : null}
                </Field>

                {trimmedMentorEmail && !hasResolvedMentor ? (
                  <p className="mt-2 text-[13px] font-semibold leading-[1.35] text-[#FF5364]">
                    Выберите наставника из подсказки.
                  </p>
                ) : null}

                <Field label="Комментарии" className="mt-4">
                  <textarea
                    className="input-design min-h-[132px] resize-y text-[14px]"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={COMMENT_MAX_LENGTH}
                    placeholder="Кратко опишите менторство"
                  />
                </Field>
              </div>

              <div>
                <div className="rounded-[10px] bg-[#E7F1F4] px-4 py-3 text-[14px] text-[#1F305E]">
                  Требуется: <strong>{mentor?.required ?? 24}</strong>. Подтверждено:{' '}
                  <strong>{mentor?.total ?? 0}</strong>. На рассмотрении:{' '}
                  <strong>{mentor?.pending ?? 0}</strong>.
                </div>

                {effectiveLimit != null ? (
                  <div className="mt-3 rounded-[10px] bg-[#EFF1F5] px-4 py-3 text-[13px] text-[#1F305E]">
                    Можно добавить еще не более <strong>{effectiveLimit}</strong> часов менторства.
                  </div>
                ) : null}

                <div className="mt-5">
                  <p className="mb-3 text-[13px] font-semibold text-[#1F305E]">Формат менторства</p>
                  <div className="grid gap-3">
                    {MENTORSHIP_FORMATS.map((item) => (
                      <label
                        key={item}
                        className={`flex min-h-[42px] items-center gap-3 rounded-[10px] border px-4 text-[14px] font-semibold transition-colors ${
                          format === item
                            ? 'border-[#1F305E] bg-[#E7F1F4] text-[#1F305E]'
                            : 'border-[#B8C4D8] bg-white text-[#6B7894] hover:bg-[#F7F9FB]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mentorship-format"
                          checked={format === item}
                          onChange={() => setFormat(item)}
                          className="h-4 w-4 accent-[#1F305E]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-center text-[13px] leading-[1.35] text-[#6B7894]">
                  Если вашего ментора нет в реестре, напишите{' '}
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
  max,
}: {
  value: string;
  onChange: (value: string) => void;
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
          onChange(
            max != null && parsed > max ? formatDecimalInput(Math.max(0, max), 2) : nextValue,
          );
        }
      }}
      max={max ?? undefined}
    />
  );
}
