// src/features/files/components/AvatarUploadModal.tsx
import { useRef, useState } from 'react';
import { FileUpload, type UploadedFile } from '@/utils/FileUpload';
import { useSetAvatarUrl } from '../hooks/useSetAvatarUrl';

type Props = {
  userId: string;
  onClose: () => void;
};

export function AvatarUploadModal({ userId, onClose }: Props) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const setAvatar = useSetAvatarUrl(userId);
  const resetKeyRef = useRef(0);

  const handleSave = async () => {
    const url = file ? `/uploads/${file.fileId}` : null;
    await setAvatar.mutateAsync(url);
    onClose();
    // сброс для следующего открытия модалки
    resetKeyRef.current += 1;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl p-6 w-full max-w-md header-shadow"
        style={{ border: '1px solid var(--color-green-light)' }}
      >
        <h3 className="text-xl font-semibold text-blue-dark mb-4">Загрузка аватара</h3>

        <FileUpload
          category="avatar"
          onChange={setFile}
          accept={{ 'image/*': [] }}
          maxSizeMB={2}
          helperText="PNG/JPEG/WebP, до 2 МБ"
          resetKey={resetKeyRef.current}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose} disabled={setAvatar.isPending}>
            Отмена
          </button>
          <button
            className="btn btn-accent"
            onClick={handleSave}
            disabled={setAvatar.isPending || !file}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
