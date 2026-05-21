// src/features/dashboard-v2/dashboardV2/components/info/profile-avatar/component/ProfileAvatar.tsx
import { useState } from 'react';
import { DashboardHelpTooltip } from '@/components/DashboardHelpTooltip';
import { AvatarDisplay } from '@/features/files/components/AvatarDisplay';
import {
  AVATAR_UPLOAD_HINT,
  AvatarUploadModal,
} from '@/features/files/components/AvatarUploadModal';

type Props = {
  userId: string;
  avatarUrl?: string | null;
  fullName?: string | null;
};

export function ProfileAvatar({ userId, avatarUrl, fullName }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="relative inline-block">
        <AvatarDisplay
          src={avatarUrl}
          alt={fullName?.trim() || 'Аватар пользователя'}
          w="w-[152px]"
          h="h-[152px]"
          editable
          onClick={() => setIsOpen(true)}
        />
        <DashboardHelpTooltip
          content={AVATAR_UPLOAD_HINT}
          className="absolute right-1 top-1"
          align="right"
        />
      </div>

      {isOpen && (
        <AvatarUploadModal
          userId={userId}
          onClose={() => setIsOpen(false)}
          currentAvatarUrl={avatarUrl ?? null}
          hint={AVATAR_UPLOAD_HINT}
        />
      )}
    </>
  );
}
