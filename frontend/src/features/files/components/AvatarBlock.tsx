// src/features/files/components/AvatarBlock.tsx
import { useRef, useState } from 'react';
import { FileUpload, type UploadedFile } from '@/utils/FileUpload';
import { useSetAvatarUrl } from '../hooks/useSetAvatarUrl';

type Props = { userId: string; avatarUrl?: string | null; readOnly?: boolean };

export function AvatarBlock({ userId, avatarUrl, readOnly }: Props) {
  const [ver, setVer] = useState(0); // для кэш-баста превью
  const lastUrlRef = useRef<string | null>(avatarUrl ?? null); // защита от дублей
  const setAvatar = useSetAvatarUrl(userId);

  const handleChange = async (file: UploadedFile | null) => {
    const backendUrl = import.meta.env.VITE_API_URL;
    const url = file ? `${backendUrl}/uploads/${file.fileId}` : null;

    // уже такое же значение — ничего не делаем
    if (url === lastUrlRef.current) return;

    await setAvatar.mutateAsync(url);
    lastUrlRef.current = url;
    setVer((v) => v + 1); // обновить превью
  };

  return (
    <div className="flex items-start gap-4">
      <div className="relative w-28 h-20 rounded-2xl bg-white overflow-hidden">
        <img
          src={avatarUrl ? `${avatarUrl}?v=${ver}` : '/avatar_placeholder.svg'}
          alt="avatar"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {!readOnly && (
        <div className="space-y-2">
          <FileUpload
            category="avatar"
            onChange={handleChange}
            accept={{ 'image/*': [] }}
            maxSizeMB={2}
            helperText="PNG/JPEG/WebP, до 2 МБ"
            disabled={setAvatar.isPending}
          />
        </div>
      )}
    </div>
  );
}
