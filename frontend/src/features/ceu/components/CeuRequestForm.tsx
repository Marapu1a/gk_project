import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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

export function CeuRequestForm() {
  const [currentFileId, setCurrentFileId] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CeuRequestFormData>({
    resolver: zodResolver(ceuRequestSchema),
    defaultValues: {
      eventName: '',
      eventDate: '',
      fileId: '',
      entries: [{ category: 'GENERAL', value: 1 }],
    },
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  const onSubmit = async (data: CeuRequestFormData) => {
    try {
      const response = await submitCeuRequest(data);
      const moderators = await getModerators();

      const senderEmail = response.submittedBy;

      await Promise.all(
        moderators.map((mod) =>
          postNotification({
            userId: mod.id,
            type: 'CEU',
            message: `Новая заявка от ${senderEmail} на проверку CEU-баллов`,
            link: '/review/ceu',
          }),
        ),
      );

      queryClient.invalidateQueries({ queryKey: ['ceu', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
      setCurrentFileId('');
      reset();
      alert('Заявка отправлена');
      navigate('/dashboard');
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-blue-dark">Новая заявка на CEU</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Файл подтверждения</label>
          <FileUpload
            multiple={false}
            onChange={(ids) => {
              const id = ids[0];
              setCurrentFileId(id);
              setValue('fileId', id);
            }}
          />
          {!currentFileId && (
            <p className="text-error text-sm mt-1">Файл обязателен для отправки</p>
          )}
        </div>

        <div>
          <label className="block font-medium mb-1">Название мероприятия</label>
          <input type="text" {...register('eventName')} className="input" />
          {errors.eventName && <p className="text-error mt-1">{errors.eventName.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-1">Дата мероприятия</label>
          <Controller
            control={control}
            name="eventDate"
            render={({ field }) => (
              <DatePicker
                selected={field.value ? new Date(field.value) : null}
                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                dateFormat="yyyy-MM-dd"
                placeholderText="Выберите дату"
                className="input"
              />
            )}
          />
          {errors.eventDate && (
            <p className="text-error mt-1">{errors.eventDate.message as string}</p>
          )}
        </div>

        <div>
          <label className="block font-medium mb-2">CEU-баллы</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <select {...register(`entries.${index}.category`)} className="input w-48">
                  <option value="ETHICS">Этика</option>
                  <option value="CULTURAL_DIVERSITY">Культурное разнообразие</option>
                  <option value="SUPERVISION">Супервизия</option>
                  <option value="GENERAL">Общие баллы</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  max={9}
                  {...register(`entries.${index}.value`, { valueAsNumber: true })}
                  className="input w-24"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
                  className={`px-3 py-1 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 transition ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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

        <Button type="submit" loading={isSubmitting} disabled={!currentFileId} className="w-full">
          Отправить заявку
        </Button>
      </form>

      <BackButton />
    </div>
  );
}
