// src/features/notifications/components/NotificationModal.tsx
import { useNotifications, useDeleteNotification } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

export function NotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [] } = useNotifications();
  const deleteNotif = useDeleteNotification();
  const navigate = useNavigate();

  if (!open) return null;

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('Удалить уведомление?');
    if (confirmed) deleteNotif.mutate(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border shadow-sm w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-blue-dark">Уведомления</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет новых уведомлений</p>
          ) : (
            data.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className="flex justify-between items-center bg-blue-soft/40 border border-blue-dark/10 rounded-xl px-4 py-3"
              >
                <button
                  onClick={() => {
                    if (n.link) navigate(n.link);
                    onClose();
                  }}
                  className="text-left text-sm text-blue-dark hover:underline flex-1"
                >
                  {n.message}
                </button>

                <button
                  onClick={() => handleDelete(n.id)}
                  className="ml-3 text-sm text-red-500 hover:text-red-700 font-bold"
                  aria-label="Удалить"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
