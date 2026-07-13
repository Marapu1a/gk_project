// src/features/files/components/AvatarUploadModal.tsx
import { useRef, useState } from 'react';
import { DashboardHelpTooltip } from '@/components/DashboardHelpTooltip';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
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
    <ModalShell
      onClose={onClose}
      ariaLabelledBy="avatar-upload-title"
      overlayClassName="z-50 bg-black/40 px-4"
      dialogClassName="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-green-light)] bg-white p-6 header-shadow"
    >
      <ModalCloseButton onClick={onClose} disabled={setAvatar.isPending} />

      <div className="mb-4 flex items-center gap-2">
        <h3 id="avatar-upload-title" className="text-xl font-semibold text-blue-dark">
          Загрузка аватара
        </h3>
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
          <button
            className="btn btn-danger mr-auto"
            onClick={handleDelete}
            disabled={setAvatar.isPending}
          >
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
    </ModalShell>
  );
}
