import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { supervisionRequestSchema } from '../validation/supervisionRequestSchema';
import type { SupervisionRequestFormData } from '../validation/supervisionRequestSchema';
import { useSubmitSupervisionRequest } from '../hooks/useSubmitSupervisionRequest';
import { BackButton } from '@/components/BackButton';
import { useState } from 'react';
import { uploadFile } from '../api/uploadFile';
import { deleteFile } from '../api/deleteFile';

export function SupervisionRequestForm() {
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle',
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SupervisionRequestFormData>({
    resolver: zodResolver(supervisionRequestSchema),
    defaultValues: {
      supervisorEmail: '',
      entries: [{ type: 'INSTRUCTOR', value: 1 }],
      fileId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });
  const queryClient = useQueryClient();
  const mutation = useSubmitSupervisionRequest();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    try {
      if (currentFileId) await deleteFile(currentFileId);
      const fileId = await uploadFile(file);
      setCurrentFileId(fileId);
      setValue('fileId', fileId);
      setUploadStatus('success');
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    }
  };

  const onSubmit = async (data: SupervisionRequestFormData) => {
    try {
      await mutation.mutateAsync(data);
      reset();
      queryClient.invalidateQueries({ queryKey: ['supervision', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['supervision', 'unconfirmed'] });
      setCurrentFileId('');
      setUploadStatus('idle');
      alert('Заявка отправлена');
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-blue-dark">Новая заявка на супервизию</h1>

      <div>
        <label className="block font-medium mb-1">Файл подтверждения</label>
        <input type="file" onChange={handleFileUpload} className="input" />
        {uploadStatus === 'uploading' && (
          <p className="text-blue-500 text-sm mt-1">Загрузка файла...</p>
        )}
        {uploadStatus === 'success' && <p className="text-green-600 text-sm mt-1">Файл загружен</p>}
        {uploadStatus === 'error' && <p className="text-error">Ошибка загрузки файла</p>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Email супервизора</label>
          <input type="email" {...register('supervisorEmail')} className="input" />
          {errors.supervisorEmail && <p className="text-error">{errors.supervisorEmail.message}</p>}
        </div>

        <div>
          <label className="block font-medium mb-2">Часы супервизии</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <select {...register(`entries.${index}.type`)} className="input w-40">
                  <option value="INSTRUCTOR">Инструктор</option>
                  <option value="CURATOR">Куратор</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  max={99}
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
            onClick={() => append({ type: 'INSTRUCTOR', value: 1 })}
            className="btn btn-brand mt-2"
          >
            Добавить часы
          </button>
          {errors.entries && <p className="text-error mt-1">{errors.entries.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !currentFileId}
          className="btn btn-brand w-full"
        >
          Отправить заявку
        </button>
      </form>

      <BackButton />
    </div>
  );
}
