import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const { data: notifications } = useNotifications();
  const count = notifications?.length ?? 0;
  const hasNotifications = count > 0;

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-gray-100 transition"
      aria-label="Оповещения"
    >
      <Bell className="w-6 h-6 text-blue-dark" style={{ opacity: hasNotifications ? 1 : 0.4 }} />

      {hasNotifications && (
        <span
          className="absolute -top-0.5 -right-0.5 text-white text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center z-10"
          style={{ backgroundColor: 'var(--sonner-error)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
