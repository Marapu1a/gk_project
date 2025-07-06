import { useDeleteFile } from '../hooks/useDeleteFile';
import { useUpdateFileType } from '../hooks/useUpdateFileType';
import { documentTypeLabels } from '../utils/documentTypeLabels';

type Props = {
  files: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
    type?: string;
    comment?: string;
  }[];
};

const backendUrl = import.meta.env.VITE_API_URL;

export function DocumentReviewTable({ files }: Props) {
  const deleteFile = useDeleteFile();
  const updateFileType = useUpdateFileType();

  const handleDelete = (id: string) => {
    if (confirm('Удалить файл?')) {
      deleteFile.mutate(id);
    }
  };

  const handleTypeChange = (id: string, type: string) => {
    updateFileType.mutate({ fileId: id, type });
  };

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
            <p className="text-sm font-medium">{file.name}</p>
            <select
              value={file.type || ''}
              onChange={(e) => handleTypeChange(file.id, e.target.value)}
              className="input w-full"
            >
              <option value="">Выберите тип</option>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {file.comment && <p className="text-xs text-gray-600">{file.comment}</p>}
          </div>

          <button
            type="button"
            onClick={() => handleDelete(file.id)}
            className="text-red-500 hover:text-red-700 text-lg font-bold"
            title="Удалить файл"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
