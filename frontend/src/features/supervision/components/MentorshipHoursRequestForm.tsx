import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';

import { fetchCurrentUser } from '@/features/auth/api/me';
import { useReviewerSuggestions } from '../hooks/useReviewerSuggestions';
import { useSubmitSupervisionRequest } from '../hooks/useSubmitSupervisionRequest';
import { useSupervisionSummary } from '../hooks/useSupervisionSummary';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';

const hoursInputSchema = z.string().refine(
  (value) => value === '' || /^\d*(?:[.]\d{0,2})?$/.test(value),
  'Введите неотрицательное число',
);

const MENTORSHIP_FORMATS = [
  'Очно',
  'По телефону',
  'Дистанционно / онлайн',
] as const;

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

function parseHours(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
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
  const [format, setFormat] = useState<(typeof MENTORSHIP_FORMATS)[number] | ''>('');
  const [comment, setComment] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);

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

  const hoursValue = parseHours(mentorshipHours);
  const mentor = summary?.mentor ?? null;
  const remaining =
    mentor && mentor.required > 0
      ? Math.max(0, round2(mentor.required - mentor.total - mentor.pending))
      : null;
  const effectiveLimit = remaining == null ? null : Math.max(0, remaining);
  const today = todayInputValue();
  const canSubmit =
    mentorshipDate.length > 0 &&
    mentorshipDate <= today &&
    hoursValue > 0 &&
    (effectiveLimit == null || hoursValue <= effectiveLimit) &&
    mentorEmail.trim().length > 0 &&
    format.length > 0 &&
    ethicsAccepted &&
    !mutation.isPending;

  const resetForm = () => {
    setMentorshipDate(todayInputValue());
    setMentorshipHours('0');
    setMentorEmail('');
    setFormat('');
    setComment('');
    setEthicsAccepted(Boolean(user?.supervisionEthicsAcceptedAt));
  };

  const submit = async () => {
    if (mentorshipDate > today) {
      toast.error('Дата менторства не может быть в будущем.');
      return;
    }

    if (hoursValue <= 0) {
      toast.error('Укажите количество часов менторства.');
      return;
    }

    if (effectiveLimit != null && hoursValue > effectiveLimit) {
      toast.error(`Можно добавить не более ${effectiveLimit} часов менторства.`);
      return;
    }

    if (!format) {
      toast.error('Выберите формат менторства.');
      return;
    }

    if (!canSubmit) return;

    try {
      await mutation.mutateAsync({
        supervisorEmail: mentorEmail.trim(),
        periodStartedAt: mentorshipDate,
        periodEndedAt: mentorshipDate,
        treatmentSetting: format,
        description: comment.trim() || undefined,
        ethicsAccepted,
        entries: [{ type: 'SUPERVISOR', value: hoursValue }],
      });

      toast.success('Заявка на менторство отправлена');
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
        Добавить часы менторства
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
                    <NumberInput value={mentorshipHours} onChange={setMentorshipHours} />
                  </Field>
                </div>

                <Field label="Ментор (наставник)" className="relative mt-4">
                  <input
                    className="input-design h-[36px]"
                    value={mentorEmail}
                    onChange={(event) => {
                      setMentorEmail(event.target.value);
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
                      Пользователь не найден. Можно ввести email вручную.
                    </div>
                  ) : null}
                </Field>

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
                  <p className="mb-3 text-[13px] font-semibold text-[#1F305E]">
                    Формат менторства
                  </p>
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
                  Если вашего ментора нет в реестре, напишите{' '}
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
}: {
  value: string;
  onChange: (value: string) => void;
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
    />
  );
}
