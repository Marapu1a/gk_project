import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../api/uploadFile';

type UploadedFile = {
  fileId: string;
  name: string;
  size: number;
};

export function DocumentReviewUpload({ onUploaded }: { onUploaded: (fileId: string) => void }) {
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploadingFiles((prev) => [...prev, file.name]);

        try {
          const fileId = await uploadFile(file);
          onUploaded(fileId);

          setUploadedFiles((prev) => [...prev, { fileId, name: file.name, size: file.size }]);
        } catch (err) {
          console.error('Ошибка загрузки файла', err);
        } finally {
          setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
        }
      }
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'image/*': [],
      'application/pdf': [],
    },
    disabled: uploadingFiles.length > 0,
  });

  return (
    <section className="p-4 border border-dashed border-gray-400 rounded text-center">
      <div {...getRootProps()} className="cursor-pointer">
        <input {...getInputProps()} />
        <p>
          {isDragActive
            ? 'Отпустите файлы для загрузки'
            : 'Перетащите сюда файлы или кликните для выбора'}
        </p>
      </div>

      <aside className="mt-4">
        <h4 className="font-medium">Загруженные файлы</h4>
        <ul className="text-sm mt-2">
          {uploadedFiles.map((file) => (
            <li key={file.fileId}>
              {file.name} - {Math.round(file.size / 1024)} кб
            </li>
          ))}
        </ul>

        {uploadingFiles.length > 0 && (
          <div className="text-blue-500 mt-2">Загрузка файлов: {uploadingFiles.join(', ')}</div>
        )}
      </aside>
    </section>
  );
}
