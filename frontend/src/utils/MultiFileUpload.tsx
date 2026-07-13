import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { useUpdateFileType } from '@/features/documentReview/hooks/useUpdateFileType';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

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
const MAX_FILES = 10;
const MAX_SIZE_MB = 10;

export function MultiFileUpload({ onChange, disabled }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const updateFileType = useUpdateFileType();
  const { confirm } = useConfirm();

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
  }, [onChange]);

  const saveState = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onChange(newFiles);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFiles));
  };

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled || files.length >= MAX_FILES) return;

    const file = accepted[0];
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(UI_TOAST_MESSAGES.files.tooLarge(MAX_SIZE_MB));
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, 'documents');
      const updated = [...files, uploaded];
      saveState(updated);
      toast.success(UI_TOAST_MESSAGES.files.fileUploaded);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        (err?.response?.status === 413
          ? UI_TOAST_MESSAGES.files.tooLarge(MAX_SIZE_MB)
          : UI_TOAST_MESSAGES.files.uploadFailed);

      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (disabled) return;
    if (
      !(await confirm({
        message: 'Удалить файл?',
        confirmLabel: 'Удалить',
        variant: 'danger',
      }))
    ) {
      return;
    }
    try {
      await deleteFile(id);
      toast.success(UI_TOAST_MESSAGES.files.fileDeleted);
    } catch {
      toast.info('Физически удалить не удалось. Уберём из списка.');
    } finally {
      const updated = files.filter((f) => f.id !== id);
      saveState(updated);
    }
  };

  const handleTypeChange = async (id: string, type: DocumentType) => {
    const previousType = files.find((file) => file.id === id)?.type;
    const updated = files.map((f) => (f.id === id ? { ...f, type } : f));
    saveState(updated);
    try {
      await updateFileType.mutateAsync({ fileId: id, type });
    } catch {
      const rolledBack = updated.map((file) =>
        file.id === id && file.type === type
          ? { ...file, type: previousType }
          : file,
      );
      saveState(rolledBack);
      toast.error(UI_TOAST_MESSAGES.documents.updateFailed);
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
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-[#FF5364] text-white font-bold">
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
              disabled={disabled || updateFileType.isPending}
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
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-65 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
            title="Удалить файл"
            aria-label="Удалить файл"
            disabled={disabled}
          >
            <img src={EXIT_ICON} alt="" className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
