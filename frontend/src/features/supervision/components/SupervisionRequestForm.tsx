// src/features/supervision/components/SupervisionRequestForm.tsx
import { useEffect, useMemo, useRef } from 'react';
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

  const form = useForm<SupervisionRequestFormData>({
    resolver: zodResolver(supervisionRequestSchema),
    defaultValues: {
      supervisorEmail: '',
      entries: [],
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const { register, handleSubmit, control, formState, reset } = form;
  const { errors, isSubmitting } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  const isMentor = useMemo(() => {
    const names = user?.groups?.map((g: { name: string }) => g.name) ?? [];
    return names.includes('Супервизор') || names.includes('Опытный Супервизор');
  }, [user]);

  const userEmail = user?.email ?? 'без email';

  // первичная инициализация
  useEffect(() => {
    if (user && !hasInitialized.current) {
      reset({
        supervisorEmail: '',
        entries: [{ type: isMentor ? 'SUPERVISOR' : 'INSTRUCTOR', value: 1 }],
      });
      hasInitialized.current = true;
    }
  }, [user, isMentor, reset]);

  // глобальное уведомление, если форма не прошла валидацию
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      toast.error('Проверьте форму — есть ошибки');
    }
  }, [errors]);

  const onSubmit = async (data: SupervisionRequestFormData) => {
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-blue-dark">
        {isMentor ? 'Новая заявка на менторство' : 'Новая заявка на супервизию'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">
            Email {isMentor ? 'опытного супервизора' : 'супервизора'}
          </label>
          <input
            type="email"
            {...register('supervisorEmail')}
            className="input"
            aria-invalid={!!errors.supervisorEmail || undefined}
          />
          {errors.supervisorEmail && (
            <p className="text-error text-sm mt-1">{errors.supervisorEmail.message}</p>
          )}
        </div>

        <div>
          <label className="block font-medium mb-2">
            {isMentor ? 'Часы менторства' : 'Часы супервизии'}
          </label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                {isMentor ? (
                  // у менторов тип фиксирован
                  <input type="hidden" value="SUPERVISOR" {...register(`entries.${index}.type`)} />
                ) : (
                  <select
                    {...register(`entries.${index}.type`)}
                    className="input w-40"
                    aria-invalid={!!errors.entries?.[index]?.type || undefined}
                  >
                    <option value="INSTRUCTOR">Инструктор</option>
                    <option value="CURATOR">Куратор</option>
                  </select>
                )}

                <div className="flex flex-col">
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={200} // синхронно с zod .max(200)
                    {...register(`entries.${index}.value`, { valueAsNumber: true })}
                    className="input w-28"
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

          <button
            type="button"
            onClick={() => append({ type: isMentor ? 'SUPERVISOR' : 'INSTRUCTOR', value: 1 })}
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
