import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const { data: notifications } = useNotifications();
  const count = notifications?.length || 0;

  console.log('🔔 NotificationBell — notifications:', notifications);
  console.log('🔔 NotificationBell — count:', count);

  return (
    <button onClick={onClick} className="relative">
      <Bell className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
