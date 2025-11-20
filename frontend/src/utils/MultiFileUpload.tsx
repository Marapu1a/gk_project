import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { useUpdateFileType } from '@/features/documentReview/hooks/useUpdateFileType';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export type UploadedFile = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  type?: DocumentType;
};

interface Props {
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

const LOCAL_STORAGE_KEY = 'files:documents';
const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

export function MultiFileUpload({ onChange, disabled }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const updateFileType = useUpdateFileType();

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed: UploadedFile[] = JSON.parse(saved);
      setFiles(parsed);
      onChange(parsed);
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  const saveState = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onChange(newFiles);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFiles));
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled || files.length >= MAX_FILES) return;

    const file = accepted[0];
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Файл больше ${MAX_SIZE_MB} МБ`);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, 'documents');
      const updated = [...files, uploaded];
      saveState(updated);
      toast.success('Файл загружен');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (disabled) return;
    if (!(await confirmToast('Удалить файл?'))) return;
    try {
      await deleteFile(id);
      toast.success('Файл удалён');
    } catch {
      toast.info('Физически удалить не удалось. Уберём из списка.');
    } finally {
      const updated = files.filter((f) => f.id !== id);
      saveState(updated);
    }
  };

  const handleTypeChange = async (id: string, type: DocumentType) => {
    const updated = files.map((f) => (f.id === id ? { ...f, type } : f));
    saveState(updated);
    try {
      await updateFileType.mutateAsync({ fileId: id, type });
    } catch {
      toast.error('Не удалось сохранить тип документа');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: { 'application/pdf': [], 'image/*': [] },
    disabled: disabled || files.length >= MAX_FILES,
  });

  const canAddMore = files.length < MAX_FILES && !disabled;

  return (
    <div className="space-y-4">
      {/* Зона загрузки */}
      <div
        {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed text-center text-sm cursor-pointer transition p-6 ${
          canAddMore ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
        }`}
        style={{ borderColor: 'var(--color-green-light)' }}
        aria-disabled={!canAddMore}
      >
        <input {...getInputProps()} />
        {uploading
          ? 'Загрузка…'
          : isDragActive
            ? 'Бросайте сюда'
            : `Перетащите файл или кликните для выбора (до ${MAX_FILES} шт.)`}
        {files.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            Осталось: {Math.max(0, MAX_FILES - files.length)}
          </div>
        )}
      </div>

      {/* Список файлов */}
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-4 p-3 rounded border bg-green-light/10"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          {file.mimeType.startsWith('image/') ? (
            <img
              src={`/uploads/${file.fileId}`}
              alt={file.name}
              className="w-16 h-16 object-cover rounded border"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
          ) : file.mimeType === 'application/pdf' ? (
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-red-100 text-red-600 font-bold">
              PDF
            </div>
          ) : (
            <div className="text-sm truncate max-w-40">{file.name}</div>
          )}

          <div className="flex-1 space-y-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <select
              value={file.type || ''}
              onChange={(e) => handleTypeChange(file.id, e.target.value as DocumentType)}
              className="input w-full"
              disabled={disabled}
            >
              <option value="">Выберите тип</option>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleDelete(file.id)}
            className="p-1 text-red-500 hover:text-red-700 transition disabled:opacity-50"
            title="Удалить файл"
            disabled={disabled}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
