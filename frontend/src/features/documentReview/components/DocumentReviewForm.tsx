import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { documentReviewSchema } from '../validation/documentReviewSchema';
import type { DocumentReviewFormData } from '../validation/documentReviewSchema';
import { useCreateDocumentReviewRequest } from '../hooks/useCreateDocumentReviewRequest';
import { uploadFile } from '../api/uploadFile';
import { Button } from '@/components/Button';
import { documentTypeLabels } from '../utils/documentTypeLabels';
import { BackButton } from '@/components/BackButton';

export function DocumentReviewForm() {
  const methods = useForm<DocumentReviewFormData>({
    resolver: zodResolver(documentReviewSchema),
    defaultValues: {
      documents: [],
    },
  });

  const { control, handleSubmit, register } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'documents' });

  const [uploadedFiles, setUploadedFiles] = useState<{ fileId: string; preview?: string }[]>([]);

  const createRequest = useCreateDocumentReviewRequest();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          const fileId = await uploadFile(file);
          const isImage = file.type.startsWith('image/');
          const preview = isImage ? URL.createObjectURL(file) : undefined;

          append({
            fileId,
            type: 'HIGHER_EDUCATION',
            comment: '',
          });

          setUploadedFiles((prev) => [...prev, { fileId, preview }]);
        } catch (err) {
          console.error('Ошибка загрузки файла', err);
        }
      }
    },
    [append],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/*': [], 'application/pdf': [] },
  });

  const onSubmit = (data: DocumentReviewFormData) => {
    if (data.documents.length === 0) {
      alert('Добавьте хотя бы один документ');
      return;
    }

    createRequest.mutate({
      documentDetails: data.documents,
    });
  };

  const handleRemove = (index: number) => {
    const file = fields[index];
    const uploaded = uploadedFiles.find((f) => f.fileId === file.fileId);
    if (uploaded?.preview) {
      URL.revokeObjectURL(uploaded.preview);
    }
    setUploadedFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
    remove(index);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      uploadedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadedFiles]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 p-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm max-w-xl mx-auto"
      >
        <h1 className="text-2xl font-bold text-blue-dark">Загрузка документов на проверку</h1>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="p-6 border-2 border-dashed border-green-brand rounded-md text-center cursor-pointer hover:bg-green-light/10 transition"
        >
          <input {...getInputProps()} />
          <p className="text-sm text-gray-600">Перетащите сюда файлы или кликните для выбора</p>
        </div>

        {/* Compact file list */}
        {fields.length > 0 && (
          <ul className="space-y-3">
            {fields.map((field, index) => {
              const preview = uploadedFiles.find((f) => f.fileId === field.fileId)?.preview;

              return (
                <li
                  key={field.id}
                  className="flex items-center gap-4 p-3 border border-green-light rounded bg-green-light/10"
                >
                  {preview && (
                    <img
                      src={preview}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded border"
                    />
                  )}

                  <div className="flex-1 space-y-1">
                    <select
                      {...register(`documents.${index}.type` as const)}
                      className="input w-full"
                    >
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      {...register(`documents.${index}.comment`)}
                      placeholder="Комментарий (необязательно)"
                      className="input w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-red-500 hover:text-red-700 text-lg font-bold"
                    title="Удалить документ"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Button type="submit" loading={createRequest.isPending} className="w-full">
          Отправить заявку
        </Button>

        <BackButton />
      </form>
    </FormProvider>
  );
}
