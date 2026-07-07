import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationModal } from './NotificationModal';
import { BellIcon } from '@/features/dashboard-v2/dashboardV2/components/info/profile-card/icons/BellIcon';

type Props = {
  className?: string;
};

export function NotificationBellButton({ className = 'icon-button icon-button-primary relative h-[42px] w-[42px]' }: Props) {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Уведомления"
        className={className}
      >
        <BellIcon className="h-full w-full" />

        {unreadCount > 0 && (
          <span className="badge badge-danger absolute -right-[4px] -top-[4px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
