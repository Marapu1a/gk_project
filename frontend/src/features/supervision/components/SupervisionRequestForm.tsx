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
  });

  const { register, handleSubmit, control, formState, reset } = form;
  const { errors, isSubmitting } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  const isMentor = useMemo(() => {
    const names = user?.groups?.map((g: { name: string }) => g.name) ?? [];
    return names.includes('Супервизор') || names.includes('Опытный Супервизор');
  }, [user]);

  useEffect(() => {
    if (user && !hasInitialized.current) {
      reset({
        supervisorEmail: '',
        entries: [{ type: isMentor ? 'SUPERVISOR' : 'INSTRUCTOR', value: 1 }],
      });
      hasInitialized.current = true;
    }
  }, [user, isMentor, reset]);

  const onSubmit = async (data: SupervisionRequestFormData) => {
    try {
      await mutation.mutateAsync(data);

      const supervisor = await getUserByEmail(data.supervisorEmail);

      if (!supervisor?.id) {
        alert('Супервизор не найден');
        return;
      }

      await postNotification({
        userId: supervisor.id,
        type: 'SUPERVISION',
        message: `Новая заявка на ${isMentor ? 'менторство' : 'супервизию'} от ${user.email}`,
        link: '/review/supervision',
      });

      queryClient.invalidateQueries({ queryKey: ['supervision', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['supervision', 'unconfirmed'] });
      alert('Заявка отправлена');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Ошибка при отправке формы:', err);
      alert(err?.response?.data?.error || 'Ошибка отправки');
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
          <input type="email" {...register('supervisorEmail')} className="input" />
          {errors.supervisorEmail && <p className="text-error">{errors.supervisorEmail.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-2">
            {isMentor ? 'Часы менторства' : 'Часы супервизии'}
          </label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                {isMentor ? (
                  <input type="hidden" value="SUPERVISOR" {...register(`entries.${index}.type`)} />
                ) : (
                  <select {...register(`entries.${index}.type`)} className="input w-40">
                    <option value="INSTRUCTOR">Инструктор</option>
                    <option value="CURATOR">Куратор</option>
                  </select>
                )}
                <input
                  type="number"
                  step="0.1"
                  max={200}
                  {...register(`entries.${index}.value`, { valueAsNumber: true })}
                  className="input w-24"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
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
          {errors.entries && <p className="text-error mt-1">{errors.entries.message}</p>}
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
