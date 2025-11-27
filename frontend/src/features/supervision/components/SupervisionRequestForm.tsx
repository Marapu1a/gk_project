// src/features/supervision/components/SupervisionRequestForm.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { supervisionRequestSchema } from '../validation/supervisionRequestSchema';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';
import { useSubmitSupervisionRequest } from '../hooks/useSubmitSupervisionRequest';
import { getUserByEmail } from '@/features/notifications/api/getUserByEmail';
import { postNotification } from '@/features/notifications/api/notifications';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUsers } from '@/features/admin/hooks/useUsers';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';

// нормализация/токенизация как в AdminIssueCertificateForm / UsersTable
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

// максимум в ОДНОЙ заявке для менторских часов
const MAX_MENTOR_HOURS_PER_REQUEST = 24;

// приоритет групп для выбора "главной"
const GROUP_PRIORITY: Record<string, number> = {
  Соискатель: 1,
  Инструктор: 2,
  Куратор: 3,
  Супервизор: 4,
  'Опытный Супервизор': 5,
};

function getPrimaryGroupName(groups?: { name: string }[] | null) {
  if (!groups || groups.length === 0) return null;
  const sorted = [...groups].sort(
    (a, b) => (GROUP_PRIORITY[b.name] ?? 0) - (GROUP_PRIORITY[a.name] ?? 0),
  );
  return sorted[0]?.name ?? null;
}

export function SupervisionRequestForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useSubmitSupervisionRequest();
  const hasInitialized = useRef(false);

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  // подтягиваем текущий суммарный прогресс по часам
  const { data: supervisionSummary } = useSupervisionSummary();

  // ===== автор: кто он по группам =====
  const { isMentor, isExperiencedSupervisor } = useMemo(() => {
    const names = user?.groups?.map((g: { name: string }) => g.name) ?? [];
    const isSupervisor = names.includes('Супервизор');
    const isExp = names.includes('Опытный Супервизор');
    // только простой "Супервизор" набирает менторские часы
    return {
      isMentor: isSupervisor,
      isExperiencedSupervisor: isExp,
    };
  }, [user]);

  const userEmail = user?.email ?? 'без email';

  const form = useForm<SupervisionRequestFormData>({
    resolver: zodResolver(supervisionRequestSchema),
    defaultValues: {
      supervisorEmail: '',
      entries: [],
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const { register, handleSubmit, control, formState, reset, setValue, getValues } = form;
  const { errors, isSubmitting } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  // === информация по менторству из summary (для супервизоров) ===
  const mentorInfo = (supervisionSummary as any)?.mentor;
  const mentorLimit: number | null =
    isMentor && mentorInfo && typeof mentorInfo.required === 'number' ? mentorInfo.required : null;

  const mentorAlready: number =
    isMentor && mentorInfo ? (mentorInfo.total ?? 0) + (mentorInfo.pending ?? 0) : 0;

  const mentorRemaining: number | null =
    isMentor && mentorLimit !== null ? Math.max(0, mentorLimit - mentorAlready) : null;

  // === остаток практики до цели (для не-супервизоров) ===
  const practiceRemaining: number | null = useMemo(() => {
    if (!supervisionSummary || isMentor) return null;

    const requiredPractice = supervisionSummary.required?.practice ?? 0;
    if (requiredPractice <= 0) return null;

    const usablePractice = supervisionSummary.usable?.practice ?? 0;
    const pendingPractice = supervisionSummary.pending?.practice ?? 0;

    const remaining = requiredPractice - (usablePractice + pendingPractice);
    return Math.max(0, remaining);
  }, [supervisionSummary, isMentor]);

  // === итоговый лимит для ЭТОЙ заявки ===
  const requestLimit: number | null = useMemo(() => {
    if (isMentor) {
      if (mentorRemaining === null) return MAX_MENTOR_HOURS_PER_REQUEST;
      return Math.max(0, Math.min(MAX_MENTOR_HOURS_PER_REQUEST, mentorRemaining));
    }
    return practiceRemaining;
  }, [isMentor, mentorRemaining, practiceRemaining]);

  // состояние для поля "Email супервизора" с подсказками
  const [supervisorEmailInput, setSupervisorEmailInput] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // дергаем сервер с дебаунсом
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(supervisorEmailInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [supervisorEmailInput]);

  // ВАЖНО: режим фильтра по типу часов
  const { data: usersData, isLoading: isUsersLoading } = useUsers({
    search,
    page: 1,
    perPage: 20,
    supervision: isMentor ? 'mentor' : 'practice',
  });

  const allUsers = usersData?.users ?? [];

  // только подходящие ревьюеры
  const eligibleReviewers = useMemo(() => {
    return allUsers.filter((u: any) => {
      const groupNames = ((u.groups as { name: string }[] | undefined) ?? []).map((g) => g.name);
      const isExperienced = groupNames.includes('Опытный Супервизор');
      const isSupervisor = groupNames.includes('Супервизор') || isExperienced;
      const isAdmin = u.role === 'ADMIN';

      if (isMentor) {
        return isExperienced || isAdmin;
      }
      return isSupervisor || isAdmin;
    });
  }, [allUsers, isMentor]);

  // фильтр по строке поиска
  const matchedUsers = useMemo(() => {
    const tokens = tokenize(supervisorEmailInput);
    if (tokens.length === 0) return [];

    return eligibleReviewers.filter((u: any) => {
      const hayParts = [
        u.fullName,
        u.email,
        ...((u.groups as { name: string }[] | undefined)?.map((g) => g.name) ?? []),
      ];
      const hay = norm(hayParts.filter(Boolean).join(' '));
      return tokens.every((t) => hay.includes(t));
    });
  }, [eligibleReviewers, supervisorEmailInput]);

  // первичная инициализация
  useEffect(() => {
    if (user && !hasInitialized.current) {
      reset({
        supervisorEmail: '',
        entries: [{ type: isMentor ? 'SUPERVISOR' : 'PRACTICE', value: 1 }],
      });
      setSupervisorEmailInput('');
      hasInitialized.current = true;
    }
  }, [user, isMentor, reset]);

  // уведомление, если есть ошибки
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      toast.error('Проверьте форму — есть ошибки');
    }
  }, [errors]);

  const onSubmit = async (data: SupervisionRequestFormData) => {
    const totalHours = (data.entries ?? []).reduce((sum, entry) => {
      const val = typeof entry.value === 'number' ? entry.value : Number(entry.value) || 0;
      return sum + val;
    }, 0);

    if (requestLimit !== null && totalHours > requestLimit) {
      if (isMentor) {
        toast.error(
          `В одной заявке можно указать не более ${requestLimit} часов менторства для текущего лимита.`,
        );
      } else {
        toast.error(`В этой заявке можно указать не более ${requestLimit} часов практики до цели.`);
      }
      return;
    }

    if (isMentor && mentorRemaining !== null && mentorRemaining <= 0) {
      toast.error('Вы уже набрали максимально допустимое количество часов менторства.');
      return;
    }

    try {
      const supervisor = await getUserByEmail(data.supervisorEmail);
      if (!supervisor?.id) {
        toast.error('Супервизор не найден');
        return;
      }

      await mutation.mutateAsync(data);

      await postNotification({
        userId: supervisor.id,
        type: 'SUPERVISION',
        message: `Новая заявка на ${isMentor ? 'менторство' : 'супервизию'} от ${userEmail}`,
        link: '/review/supervision',
      });

      queryClient.invalidateQueries({ queryKey: ['supervision', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['supervision', 'unconfirmed'] });

      toast.success('Заявка отправлена');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Ошибка при отправке формы:', err);
      toast.error(err?.response?.data?.error || 'Ошибка отправки');
    }
  };

  if (isLoading) return <p>Загрузка...</p>;
  if (isError || !user) return <p className="text-error">Ошибка загрузки пользователя</p>;

  const supervisorEmailField = register('supervisorEmail');

  // опытный супервизор не набирает часы вообще
  if (isExperiencedSupervisor) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-blue-dark">Заявка на часы недоступна</h1>
        <p className="text-sm text-gray-700">
          Опытные супервизоры не набирают часы менторства или практики. Для менторских часов вас
          выбирают как проверяющего.
        </p>
        <BackButton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-blue-dark">
        {isMentor ? 'Новая заявка на менторство' : 'Новая заявка на супервизию'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email супервизора c подсказками */}
        <div className="relative">
          <label className="block font-medium mb-1">
            Email {isMentor ? 'опытного супервизора или админа' : 'супервизора или админа'}
          </label>
          <input
            type="text"
            {...supervisorEmailField}
            value={supervisorEmailInput}
            onChange={(e) => {
              supervisorEmailField.onChange(e);
              const v = e.target.value;
              setSupervisorEmailInput(v);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (supervisorEmailInput.trim()) setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            className="input"
            aria-invalid={!!errors.supervisorEmail || undefined}
            placeholder="Начните вводить ФИО или email…"
            autoComplete="off"
          />

          {showSuggestions && supervisorEmailInput.trim() && matchedUsers.length > 0 && (
            <div
              className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-2xl bg-white header-shadow"
              style={{ border: '1px solid var(--color-green-light)' }}
            >
              {matchedUsers.map((u: any) => {
                const primaryGroup = getPrimaryGroupName(
                  u.groups as { name: string }[] | undefined,
                );
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-green-light)' }}
                    onClick={() => {
                      setSupervisorEmailInput(u.email);
                      setValue('supervisorEmail', u.email, { shouldValidate: true });
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="font-medium">{u.fullName || 'Без имени'}</div>
                    <div className="text-xs text-gray-600">{u.email}</div>
                    {primaryGroup && (
                      <div className="text-xs text-gray-500">Группа: {primaryGroup}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {showSuggestions &&
            supervisorEmailInput.trim() &&
            !isUsersLoading &&
            matchedUsers.length === 0 && (
              <div
                className="absolute z-20 mt-1 w-full rounded-2xl bg-white header-shadow px-3 py-2 text-xs text-gray-600"
                style={{ border: '1px solid var(--color-green-light)' }}
              >
                Пользователь не найден. Можно ввести email вручную.
              </div>
            )}

          {errors.supervisorEmail && (
            <p className="text-error text-sm mt-1">{errors.supervisorEmail.message}</p>
          )}
        </div>

        <div>
          <label className="block font-medium mb-2">
            {isMentor ? 'Часы менторства' : 'Часы практики'}
          </label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <input
                  type="hidden"
                  value={isMentor ? 'SUPERVISOR' : 'PRACTICE'}
                  {...register(`entries.${index}.type`)}
                />

                <div className="flex flex-col">
                  <input
                    type="number"
                    step={1}
                    min={1}
                    max={requestLimit ?? undefined}
                    {...register(`entries.${index}.value`, { valueAsNumber: true })}
                    className="input w-32"
                    aria-invalid={!!errors.entries?.[index]?.value || undefined}
                  />
                  {errors.entries?.[index]?.value && (
                    <p className="text-error text-xs mt-1">
                      {errors.entries[index]?.value?.message}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isSubmitting || fields.length === 1}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 transition disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          {isMentor && mentorRemaining !== null && (
            <p className="mt-1 text-xs text-gray-600">
              Можно добавить ещё не более <strong>{mentorRemaining}</strong> часов менторства из
              максимально допустимых {mentorLimit}.
            </p>
          )}

          {!isMentor && practiceRemaining !== null && (
            <p className="mt-1 text-xs text-gray-600">
              До цели по практике осталось <strong>{practiceRemaining}</strong> часов. Больше в
              одной заявке указать нельзя.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const currentEntries = getValues('entries') ?? [];
              const currentTotal = currentEntries.reduce((sum, entry: any) => {
                const val =
                  typeof entry?.value === 'number' ? entry.value : Number(entry?.value) || 0;
                return sum + val;
              }, 0);

              if (requestLimit !== null && currentTotal >= requestLimit) {
                if (isMentor) {
                  toast.error(
                    `В одной заявке можно указать не более ${requestLimit} часов менторства для текущего лимита.`,
                  );
                } else {
                  toast.error(
                    `В этой заявке можно указать не более ${requestLimit} часов практики до цели.`,
                  );
                }
                return;
              }

              if (isMentor && mentorRemaining !== null && mentorRemaining <= 0) {
                toast.error('Вы уже набрали максимально допустимое количество часов менторства.');
                return;
              }

              append({ type: isMentor ? 'SUPERVISOR' : 'PRACTICE', value: 1 });
            }}
            disabled={isSubmitting}
            className="btn btn-brand mt-2 disabled:opacity-50"
          >
            Добавить часы
          </button>

          {errors.entries && typeof errors.entries?.message === 'string' && (
            <p className="text-error mt-1">{errors.entries.message as string}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-brand w-full disabled:opacity-50"
        >
          Отправить заявку
        </button>
      </form>

      <BackButton />
    </div>
  );
}
