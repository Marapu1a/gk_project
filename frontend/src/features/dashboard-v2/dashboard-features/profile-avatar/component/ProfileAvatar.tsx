// src/features/dashboard-v2/components/ProfileAvatar.tsx
import { useState } from 'react';
import { AvatarDisplay } from '@/features/files/components/AvatarDisplay';
import { AvatarUploadModal } from '@/features/files/components/AvatarUploadModal';

type Props = {
  userId: string;
  avatarUrl?: string | null;
  fullName?: string | null;
};

export function ProfileAvatar({ userId, avatarUrl, fullName }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AvatarDisplay
        src={avatarUrl}
        alt={fullName?.trim() || 'Аватар пользователя'}
        w="w-28"
        h="h-28"
        editable
        onClick={() => setIsOpen(true)}
      />

      {isOpen && <AvatarUploadModal userId={userId} onClose={() => setIsOpen(false)} />}
    </>
  );
}
