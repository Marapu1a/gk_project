import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { ceuRequestSchema } from '../validation/ceuRequestSchema';
import type { CeuRequestFormData } from '../validation/ceuRequestSchema';
import { submitCeuRequest } from '../api/submitCeuRequest';

import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { FileUpload } from '@/utils/FileUpload';
import { toast } from 'sonner';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export function CeuRequestForm() {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CeuRequestFormData>({
    resolver: zodResolver(ceuRequestSchema),
    defaultValues: {
      eventName: '',
      eventDate: '',
      fileId: '',
      entries: [{ category: 'GENERAL', value: 1 }],
    },
    mode: 'onSubmit',
  });

  const fileId = watch('fileId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  // нормальный confirm через тост, возвращает Promise<boolean>
  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const confirmRemove = async (index: number) => {
    if (await confirmToast('Удалить строку CEU?')) remove(index);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await submitCeuRequest(data);

      // уведомим модераторов; частичные фейлы не валят поток
      const moderators = await getModerators();
      const results = await Promise.allSettled(
        moderators.map((m) =>
          postNotification({
            userId: m.id,
            type: 'CEU',
            message: `Новая заявка от ${response.submittedBy} на проверку CEU-баллов`,
            link: '/review/ceu',
          }),
        ),
      );
      const failed = results.some((r) => r.status === 'rejected');

      // инвалидации CEU + карточка пользователя в админке
      queryClient.invalidateQueries({ queryKey: ['ceu', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      if (me?.id) queryClient.invalidateQueries({ queryKey: ['admin', 'user', me.id] });

      localStorage.removeItem('file:ceu');
      reset();
      toast.success('Заявка на CEU отправлена');
      if (failed) toast.info('Заявка отправлена, но не все уведомления модераторам доставлены.');
      navigate('/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Ошибка при отправке формы';
      setError('root.serverError', { message });
      toast.error(message);
    }
  });

  return (
    <div
      className="max-w-3xl mx-auto rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h1 className="text-2xl font-semibold text-blue-dark">Новая заявка на CEU</h1>
      </div>

      {/* Body */}
      <form onSubmit={onSubmit} className="px-6 py-5 space-y-6">
        {errors.root?.serverError && (
          <div
            className="text-error text-sm border rounded-md p-3"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            {errors.root.serverError.message}
          </div>
        )}

        {/* Файл подтверждения */}
        <div>
          <label className="block font-medium mb-1 text-blue-dark">Файл подтверждения</label>
          <FileUpload
            category="ceu"
            onChange={(file) => {
              setValue('fileId', file?.fileId || '');
              if (me?.id) queryClient.invalidateQueries({ queryKey: ['admin', 'user', me.id] });
            }}
            disabled={isSubmitting}
          />
          {!fileId && <p className="text-error text-sm mt-1">Файл обязателен для отправки</p>}
        </div>

        {/* Название мероприятия */}
        <div>
          <label htmlFor="eventName" className="block font-medium mb-1 text-blue-dark">
            Название мероприятия
          </label>
          <input
            id="eventName"
            type="text"
            className="input"
            disabled={isSubmitting}
            aria-invalid={!!errors.eventName}
            {...register('eventName')}
          />
          {errors.eventName && <p className="text-error mt-1">{errors.eventName.message}</p>}
        </div>

        {/* Дата мероприятия */}
        <div>
          <label htmlFor="eventDate" className="block font-medium mb-1 text-blue-dark">
            Дата мероприятия
          </label>
          <Controller
            control={control}
            name="eventDate"
            render={({ field }) => (
              <DatePicker
                id="eventDate"
                selected={field.value ? new Date(field.value) : null}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                dateFormat="yyyy-MM-dd"
                placeholderText="Выберите дату"
                className="input"
                disabled={isSubmitting}
              />
            )}
          />
          {errors.eventDate && (
            <p className="text-error mt-1">{errors.eventDate.message as string}</p>
          )}
        </div>

        {/* CEU-баллы */}
        <div>
          <label className="block font-medium mb-2 text-blue-dark">CEU-баллы</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <select
                  className="input w-48"
                  disabled={isSubmitting}
                  {...register(`entries.${index}.category`)}
                >
                  <option value="ETHICS">Этика</option>
                  <option value="CULTURAL_DIVERSITY">Культурное разнообразие</option>
                  <option value="SUPERVISION">Супервизия</option>
                  <option value="GENERAL">Общие баллы</option>
                </select>

                <input
                  type="number"
                  step="0.1"
                  max={9}
                  className="input w-24"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.entries?.[index]?.value}
                  {...register(`entries.${index}.value`, { valueAsNumber: true })}
                />

                <button
                  type="button"
                  onClick={() => confirmRemove(index)}
                  disabled={isSubmitting}
                  className="btn btn-danger"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={() => append({ category: 'GENERAL', value: 1 })}
            disabled={isSubmitting}
            className="mt-2"
          >
            Добавить баллы
          </Button>

          {errors.entries && <p className="text-error mt-1">{errors.entries.message}</p>}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={!fileId || isSubmitting}
          className="w-full"
        >
          Отправить заявку
        </Button>

        <div className="pt-2">
          <BackButton />
        </div>
      </form>
    </div>
  );
}
