import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../api/uploadFile';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  onUploaded: () => void;
};

export function FileUploader({ onUploaded }: Props) {
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          await uploadFile(file);
          queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
          onUploaded();
        } catch (err) {
          console.error('Ошибка загрузки файла', err);
        }
      }
    },
    [onUploaded, queryClient],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'application/pdf': [], 'image/*': [] },
  });

  return (
    <div
      {...getRootProps()}
      className="p-6 border-2 border-dashed border-green-brand rounded-md text-center cursor-pointer hover:bg-green-light/10 transition"
    >
      <input {...getInputProps()} />
      <p className="text-sm text-gray-600">Перетащите сюда файлы или кликните для выбора</p>
    </div>
  );
}
