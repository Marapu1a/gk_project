import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';

export type UploadedFile = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
};

interface FileUploadProps {
  category: string;
  onChange: (file: UploadedFile | null) => void;
  disabled?: boolean;
}

export function FileUpload({ category, onChange, disabled }: FileUploadProps) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const backendUrl = import.meta.env.VITE_API_URL;

  // Подтягиваем файл из localStorage при монтировании
  useEffect(() => {
    const saved = localStorage.getItem(`file:${category}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFile(parsed);
        onChange(parsed);
      } catch {
        localStorage.removeItem(`file:${category}`);
      }
    }
  }, []);

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled) return;

    if (file) {
      try {
        await deleteFile(file.id);
      } catch (err) {
        console.warn('Ошибка при удалении предыдущего файла:', err);
      }
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(accepted[0], category);
      setFile(uploaded);
      onChange(uploaded);
      localStorage.setItem(`file:${category}`, JSON.stringify(uploaded));
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
    }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!file || disabled) return;
    try {
      await deleteFile(file.id);
      setFile(null);
      onChange(null);
      localStorage.removeItem(`file:${category}`);
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: { 'application/pdf': [], 'image/*': [] },
    disabled,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded text-center text-sm cursor-pointer transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
        } ${file ? 'border-gray-300 text-gray-500' : 'border-gray-400 text-gray-600'}`}
      >
        <input {...getInputProps()} />
        {uploading
          ? 'Загрузка...'
          : file
            ? 'Заменить файл'
            : 'Перетащите файл или кликните для выбора'}
      </div>

      {file && (
        <div className="flex items-center gap-4 p-2 border rounded bg-gray-100">
          {file.mimeType.startsWith('image/') ? (
            <img
              src={`${backendUrl}/uploads/${file.fileId}`}
              alt={file.name}
              className="w-16 h-16 object-cover rounded border"
            />
          ) : file.mimeType === 'application/pdf' ? (
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-red-100 text-red-600 font-bold">
              PDF
            </div>
          ) : (
            <div className="text-sm">{file.name}</div>
          )}

          <div className="flex-1 text-sm text-gray-700 truncate">{file.name}</div>

          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-lg font-bold"
            title="Удалить"
            disabled={disabled}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
