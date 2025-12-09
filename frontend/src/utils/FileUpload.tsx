// ..src/utils/FileUpload.tsx

import { useState, useEffect, useRef } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
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

  // новые, опциональные
  accept?: Accept;
  maxSizeMB?: number;
  helperText?: string;
  resetKey?: number | string | boolean;
  onError?: (err: unknown) => void;
}

export function FileUpload({
  category,
  onChange,
  disabled,
  accept,
  maxSizeMB = 20,
  helperText,
  resetKey,
  onError,
}: FileUploadProps) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // локальное превью для image/*

  const objectUrlRef = useRef<string | null>(null);
  const makeObjectPreview = (blob?: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // подтягиваем сохранённый файл при монтировании
  useEffect(() => {
    const saved = localStorage.getItem(`file:${category}`);
    if (saved) {
      try {
        const parsed: UploadedFile = JSON.parse(saved);
        setFile(parsed);
        onChange(parsed);
      } catch {
        localStorage.removeItem(`file:${category}`);
      }
    }
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // внешний сброс
  useEffect(() => {
    if (resetKey === undefined) return;
    setFile(null);
    setError(null);
    makeObjectPreview(null);
    localStorage.removeItem(`file:${category}`);
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled) return;

    const f = accepted[0];
    if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
      const msg = `Файл больше ${maxSizeMB} МБ`;
      setError(msg);
      onError?.(new Error(msg));
      return;
    }

    // удаляем предыдущий файл на сервере (если был)
    if (file) {
      try {
        await deleteFile(file.id);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ??
          (err?.response?.status === 413
            ? `Файл превышает допустимый размер (${maxSizeMB}MB)`
            : 'Ошибка загрузки файла');

        makeObjectPreview(null);
        setFile(null);
        setError(msg);
        onError?.(new Error(msg));
        console.error('Ошибка загрузки файла:', err);
      } finally {
        setUploading(false);
      }
    }

    setUploading(true);
    setError(null);
    makeObjectPreview(f); // мгновенное локальное превью для изображений
    try {
      const uploaded = await uploadFile(f, category);
      setFile(uploaded);
      onChange(uploaded);
      localStorage.setItem(`file:${category}`, JSON.stringify(uploaded));
    } catch (err) {
      // откатываем превью при реальном фейле
      makeObjectPreview(null);
      setFile(null);
      setError('Ошибка загрузки файла, не тот формат или превышен размер файла, попробуйте снова.');
      onError?.(err);
      console.error('Ошибка загрузки файла:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!file || disabled) return;
    try {
      await deleteFile(file.id);
      setFile(null);
      onChange(null);
      localStorage.removeItem(`file:${category}`);
    } catch (err) {
      setError('Ошибка удаления файла');
      onError?.(err);
      console.error('Ошибка удаления файла:', err);
    } finally {
      makeObjectPreview(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: accept ?? { 'application/pdf': [], 'image/*': [] },
    disabled,
  });

  // URL для превью изображений: сначала локальный objectURL, дальше — сервер
  const serverUrl = file ? `/uploads/${file.fileId}` : null;
  const imagePreviewSrc = previewUrl ?? serverUrl ?? '';

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded text-center text-sm cursor-pointer transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${isDragActive ? 'bg-gray-50' : ''}
          ${file ? 'border-gray-300 text-gray-500' : 'border-gray-400 text-gray-600'}`}
      >
        <input {...getInputProps()} />
        {uploading
          ? 'Загрузка...'
          : file
            ? 'Заменить файл'
            : 'Перетащите файл или кликните для выбора'}
      </div>

      {helperText && !file && !uploading && <p className="text-xs text-gray-500">{helperText}</p>}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {file && (
        <div className="flex items-center gap-4 p-2 border rounded bg-gray-100">
          {file.mimeType.startsWith('image/') ? (
            imagePreviewSrc ? (
              <img
                src={imagePreviewSrc}
                alt={file.name}
                className="w-16 h-16 object-cover rounded border"
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center border rounded bg-gray-100 text-gray-500">
                IMG
              </div>
            )
          ) : file.mimeType === 'application/pdf' ? (
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-red-100 text-red-600 font-bold">
              PDF
            </div>
          ) : (
            <div className="text-sm">{file.name}</div>
          )}

          <div className="flex-1 text-sm text-gray-700 truncate">{file.name}</div>

          {serverUrl && (
            <a
              href={serverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
              title="Открыть в новой вкладке"
            >
              Открыть
            </a>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-lg font-bold"
            title="Удалить"
            disabled={disabled || uploading}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
