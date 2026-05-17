import { documentTypeLabels, type DocumentType } from '@/utils/documentTypeLabels';
import { type UploadedFile } from '@/utils/MultiFileUpload';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

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
          className="flex items-center gap-4 p-3 rounded border bg-green-light/10"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          {file.mimeType.startsWith('image/') ? (
            <img
              src={`$/uploads/${file.fileId}`}
              alt={file.name}
              className="w-16 h-16 object-cover rounded border"
            />
          ) : file.mimeType === 'application/pdf' ? (
            <div className="w-16 h-16 flex items-center justify-center border rounded bg-[#FF5364] text-white font-bold">
              PDF
            </div>
          ) : (
            <span className="text-xs">{file.name}</span>
          )}

          <div className="flex-1 space-y-1 min-w-0">
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
