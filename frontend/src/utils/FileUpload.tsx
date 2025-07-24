import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/features/files/api/uploadFile';
import { deleteFile } from '@/features/files/api/deleteFile';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  multiple?: boolean;
  onChange: (fileIds: string[]) => void;
};

export function FileUpload({ multiple = false, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<
    { id: string; name: string; mimeType: string; fileId: string }[]
  >([]);

  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_URL;

  const handleDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    const newIds: string[] = [];
    const newPreviews: typeof previews = [];

    for (const file of acceptedFiles) {
      try {
        const uploaded = await uploadFile(file); // ← возвращает объект
        newIds.push(uploaded.id);
        newPreviews.push({
          id: uploaded.id,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          fileId: uploaded.fileId,
        });
      } catch (err) {
        console.error('Ошибка загрузки:', err);
      }
    }

    const finalIds = multiple ? [...fileIds, ...newIds] : newIds;
    const finalPreviews = multiple ? [...previews, ...newPreviews] : newPreviews;

    if (!multiple && fileIds.length > 0) {
      try {
        await deleteFile(fileIds[0]);
      } catch (err) {
        console.warn('Ошибка при удалении предыдущего файла');
      }
    }

    setFileIds(finalIds);
    setPreviews(finalPreviews);
    onChange(finalIds);

    queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm('Удалить файл?');
    if (!confirmDelete) return;

    try {
      await deleteFile(id);
      const newIds = fileIds.filter((f) => f !== id);
      const newPrevs = previews.filter((f) => f.id !== id);
      setFileIds(newIds);
      setPreviews(newPrevs);
      onChange(newIds);
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    multiple,
    accept: { 'application/pdf': [], 'image/*': [] },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className="p-4 border-2 border-dashed border-gray-400 rounded text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
      >
        <input {...getInputProps()} />
        {uploading ? 'Загрузка...' : 'Перетащите файл или кликните для выбора'}
      </div>

      {previews.length > 0 && (
        <div className="space-y-2">
          {previews.map((file) => (
            <div key={file.id} className="flex items-center gap-4 p-2 border rounded bg-gray-100">
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

              <div className="flex-1 text-sm text-gray-700">{file.name}</div>

              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                className="text-red-500 hover:text-red-700 text-lg font-bold"
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
