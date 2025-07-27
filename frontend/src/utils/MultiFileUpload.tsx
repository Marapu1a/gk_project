import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { useUpdateFileType } from '@/features/documentReview/hooks/useUpdateFileType';

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

const backendUrl = import.meta.env.VITE_API_URL;
const LOCAL_STORAGE_KEY = 'files:documents';

export function MultiFileUpload({ onChange, disabled }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const updateFileType = useUpdateFileType();

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        onChange(parsed);
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  const saveState = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onChange(newFiles);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFiles));
  };

  const handleDrop = async (accepted: File[]) => {
    if (!accepted.length || disabled || files.length >= 5) return;

    setUploading(true);
    try {
      const uploaded = await uploadFile(accepted[0], 'documents');
      const updated = [...files, uploaded];
      saveState(updated);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (disabled) return;
    try {
      await deleteFile(id);
    } catch (err) {
      console.warn('Физическое удаление не удалось, но файл будет убран из интерфейса.');
    } finally {
      const updated = files.filter((f) => f.id !== id);
      saveState(updated);
    }
  };

  const handleTypeChange = (id: string, type: DocumentType) => {
    const updated = files.map((f) => (f.id === id ? { ...f, type } : f));
    saveState(updated);
    updateFileType.mutate({ fileId: id, type });
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    accept: { 'application/pdf': [], 'image/*': [] },
    disabled: disabled || files.length >= 5,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded text-center text-sm cursor-pointer transition ${
          disabled || files.length >= 5 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? 'Загрузка...' : 'Перетащите файл или кликните для выбора (до 5 штук)'}
      </div>

      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-4 p-3 border rounded bg-gray-100">
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

          <div className="flex-1 space-y-1">
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
            className="text-red-500 hover:text-red-700 text-lg font-bold"
            title="Удалить файл"
            disabled={disabled}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
