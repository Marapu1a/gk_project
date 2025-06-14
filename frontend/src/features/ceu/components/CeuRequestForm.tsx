// src/features/ceu/components/CeuRequestForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  });

  const onSubmit = async (data: CeuRequestFormData) => {
    await submitCeuRequest(data);
    reset();
    alert('Заявка отправлена');
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label>Название мероприятия</label>
          <input type="text" {...register('eventName')} className="input" />
          {errors.eventName && <p className="text-red-500 text-sm">{errors.eventName.message}</p>}
        </div>

        <div>
          <label>Дата мероприятия</label>
          <input type="date" {...register('eventDate')} className="input" />
          {errors.eventDate && <p className="text-red-500 text-sm">{errors.eventDate.message}</p>}
        </div>

        {/* Если в дальнейшем понадобится логика добавления файла, можно просто раскомментировать. В бэке всё прописано уже */}
        {/* <div>
        <label>Файл (необязательно)</label>
        <input type="file" {...register('file')} className="input" />
      </div> */}

        <div className="space-y-2">
          <label>CEU-баллы:</label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <select {...register(`entries.${index}.category`)} className="input">
                <option value="ETHICS">Ethics</option>
                <option value="CULTURAL_DIVERSITY">Cultural Diversity</option>
                <option value="SUPERVISION">Supervision</option>
                <option value="GENERAL">General</option>
              </select>
              <input
                type="number"
                step="0.1"
                max={9}
                {...register(`entries.${index}.value`, { valueAsNumber: true })}
                className="input w-24"
              />
              <button type="button" onClick={() => remove(index)} className="btn btn-danger">
                Удалить
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ category: 'GENERAL', value: 1 })}
            className="btn btn-brand"
          >
            Добавить баллы
          </button>
          {errors.entries && <p className="text-red-500 text-sm">{errors.entries.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-brand">
          Отправить заявку
        </button>
      </form>
      <BackButton />
    </>
  );
}
