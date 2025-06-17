import { useForm, useFieldArray } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { ceuRequestSchema } from '../validation/ceuRequestSchema';
import type { CeuRequestFormData } from '../validation/ceuRequestSchema';
import { submitCeuRequest } from '../api/submitCeuRequest';
import { BackButton } from '@/components/BackButton';

export function CeuRequestForm() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CeuRequestFormData>({
    resolver: zodResolver(ceuRequestSchema),
    defaultValues: {
      eventName: '',
      eventDate: '',
      file: undefined,
      entries: [{ category: 'GENERAL', value: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });
  const queryClient = useQueryClient();

  const onSubmit = async (data: CeuRequestFormData) => {
    await submitCeuRequest(data);
    queryClient.invalidateQueries({ queryKey: ['ceu', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['ceu', 'unconfirmed'] });
    reset();
    alert('Заявка отправлена');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-blue-dark">Новая заявка на CEU</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Название мероприятия</label>
          <input type="text" {...register('eventName')} className="input" />
          {errors.eventName && <p className="text-error mt-1">{errors.eventName.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-1">Дата мероприятия</label>
          <input type="date" {...register('eventDate')} className="input" />
          {errors.eventDate && <p className="text-error mt-1">{errors.eventDate.message}</p>}
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
                  className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 transition"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ category: 'GENERAL', value: 1 })}
            className="btn btn-brand mt-2"
          >
            Добавить баллы
          </button>
          {errors.entries && <p className="text-error mt-1">{errors.entries.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-brand w-full">
          Отправить заявку
        </button>
      </form>

      <BackButton />
    </div>
  );
}
