// src/features/files/components/AvatarUploadModal.tsx
import { useRef, useState } from 'react';
import { DashboardHelpTooltip } from '@/components/DashboardHelpTooltip';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { FileUpload, type UploadedFile } from '@/utils/FileUpload';
import { useSetAvatarUrl } from '../hooks/useSetAvatarUrl';

type Props = {
  userId: string;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  hint?: string;
  targetUserId?: string;
};

export const AVATAR_UPLOAD_HINT =
  'Если по каким-то причинам вы не загружаете фото, оставьте это поле пустым. Все, что не является портретным фото человека будет удалено специалистами технической поддержки.';

export function AvatarUploadModal({
  userId,
  onClose,
  currentAvatarUrl = null,
  hint = AVATAR_UPLOAD_HINT,
  targetUserId,
}: Props) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const setAvatar = useSetAvatarUrl(userId);
  const resetKeyRef = useRef(0);
  const hasCurrentAvatar = Boolean(currentAvatarUrl?.trim());

  const handleSave = async () => {
    const url = file ? `/uploads/${file.fileId}` : null;
    await setAvatar.mutateAsync(url);
    onClose();
    // сброс для следующего открытия модалки
    resetKeyRef.current += 1;
  };

  const handleDelete = async () => {
    await setAvatar.mutateAsync(null);
    onClose();
    resetKeyRef.current += 1;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 header-shadow"
        style={{ border: '1px solid var(--color-green-light)' }}
      >
        <ModalCloseButton onClick={onClose} disabled={setAvatar.isPending} />

        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-xl font-semibold text-blue-dark">Загрузка аватара</h3>
          <DashboardHelpTooltip content={hint} />
        </div>

        <FileUpload
          category="avatar"
          onChange={setFile}
          accept={{ 'image/*': [] }}
          maxSizeMB={2}
          helperText="PNG/JPEG/WebP, до 2 МБ"
          resetKey={resetKeyRef.current}
          targetUserId={targetUserId}
          persistKey={false}
        />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {hasCurrentAvatar ? (
            <button className="btn btn-danger mr-auto" onClick={handleDelete} disabled={setAvatar.isPending}>
              Удалить фото
            </button>
          ) : null}

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
