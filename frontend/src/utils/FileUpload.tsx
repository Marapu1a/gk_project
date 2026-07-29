// ..src/utils/FileUpload.tsx

import { useState, useEffect, useRef } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { getUiErrorMessage } from '@/utils/uiMessages';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

export type UploadedFile = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
};

interface FileUploadProps {
  category: string;
  onChange: (file: UploadedFile | null) => void | Promise<void>;
  disabled?: boolean;

  // новые, опциональные
  accept?: Accept;
  maxSizeMB?: number;
  helperText?: string;
  resetKey?: number | string | boolean;
  onError?: (err: unknown) => void;
  targetUserId?: string;
  persistKey?: string | false;
}

export function FileUpload({
  category,
  onChange,
  disabled,
  accept,
  maxSizeMB = 10,
  helperText,
  resetKey,
  onError,
  targetUserId,
  persistKey,
}: FileUploadProps) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // локальное превью для image/*

  const objectUrlRef = useRef<string | null>(null);
  const storageKey = persistKey === false ? null : persistKey ?? `file:${category}`;
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
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed: UploadedFile = JSON.parse(saved);
          setFile(parsed);
          onChange(parsed);
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
    }
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // внешний сброс
  useEffect(() => {
    if (resetKey === undefined) return;
    setFile(null);
    setError(null);
    makeObjectPreview(null);
    if (storageKey) localStorage.removeItem(storageKey);
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, storageKey]);

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled) return;

    const f = accepted[0];
    if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
      const msg = `Файл больше ${maxSizeMB} МБ`;
      setError(msg);
      onError?.(new Error(msg));
      return;
    }

    const previousFile = file;
    setUploading(true);
    setError(null);
    makeObjectPreview(f); // мгновенное локальное превью для изображений
    try {
      const uploaded = await uploadFile(f, category, targetUserId);
      await onChange(uploaded);
      setFile(uploaded);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(uploaded));

      if (previousFile && previousFile.id !== uploaded.id) {
        // Для аватара backend мог уже удалить старый файл при успешной замене.
        await deleteFile(previousFile.id).catch(() => undefined);
      }
    } catch (err) {
      // Старый файл и привязка остаются рабочими, пока новый не сохранён полностью.
      makeObjectPreview(null);
      setError(getUiErrorMessage(err, 'Не удалось загрузить файл. Проверьте формат и размер.'));
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!file || disabled) return;
    try {
      await deleteFile(file.id);
      setFile(null);
      await onChange(null);
      if (storageKey) localStorage.removeItem(storageKey);
    } catch (err) {
      setError(getUiErrorMessage(err, 'Ошибка удаления файла'));
      onError?.(err);
    } finally {
      makeObjectPreview(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: () => {
      const message =
        category === 'avatar'
          ? 'Можно загрузить только PNG, JPEG или WebP.'
          : 'Недопустимый формат файла.';
      setError(message);
      onError?.(new Error(message));
    },
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

      {error && <p className="text-xs text-[#FF5364]">{error}</p>}

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
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-[#FF5364] text-white font-bold">
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
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-65 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
            title="Удалить"
            aria-label="Удалить файл"
            disabled={disabled || uploading}
          >
            <img src={EXIT_ICON} alt="" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
