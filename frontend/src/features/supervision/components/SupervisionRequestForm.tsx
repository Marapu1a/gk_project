// src/features/supervision/components/SupervisionRequestForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  });

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
      setCurrentFileId('');
      setUploadStatus('idle');
      alert('Заявка отправлена');
    } catch (err) {
      console.error('Ошибка при отправке формы:', err);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label>Файл подтверждения</label>
          <input type="file" onChange={handleFileUpload} className="input" />
          {uploadStatus === 'uploading' && (
            <p className="text-blue-500 text-sm">Загрузка файла...</p>
          )}
          {uploadStatus === 'success' && <p className="text-green-600 text-sm">Файл загружен</p>}
          {uploadStatus === 'error' && (
            <p className="text-red-500 text-sm">Ошибка загрузки файла</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label>Email супервизора</label>
            <input type="email" {...register('supervisorEmail')} className="input" />
            {errors.supervisorEmail && (
              <p className="text-red-500 text-sm">{errors.supervisorEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label>Часы супервизии:</label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <select {...register(`entries.${index}.type`)} className="input">
                  <option value="INSTRUCTOR">Инструктор</option>
                  <option value="CURATOR">Куратор</option>
                  <option value="SUPERVISOR">Супервизор</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  max={99}
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
              onClick={() => append({ type: 'INSTRUCTOR', value: 1 })}
              className="btn btn-brand"
            >
              Добавить часы
            </button>
            {errors.entries && <p className="text-red-500 text-sm">{errors.entries.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting || !currentFileId} className="btn btn-brand">
            Отправить заявку
          </button>
        </form>
        <BackButton />
      </div>
    </>
  );
}
