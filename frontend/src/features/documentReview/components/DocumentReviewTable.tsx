import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { type UploadedFile } from '@/utils/MultiFileUpload';

const backendUrl = import.meta.env.VITE_API_URL;

interface Props {
  files: UploadedFile[];
  onDelete: (id: string) => void;
  onTypeChange: (id: string, type: DocumentType) => void;
  disabled?: boolean;
}

export function DocumentReviewTable({ files, onDelete, onTypeChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-4 p-3 border border-green-light rounded bg-green-light/10"
        >
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
            <span className="text-xs">{file.name}</span>
          )}

          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <select
              value={file.type || ''}
              onChange={(e) => onTypeChange(file.id, e.target.value as DocumentType)}
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
            onClick={() => onDelete(file.id)}
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
