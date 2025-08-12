// src/features/notifications/components/NotificationModal.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications, useDeleteNotification } from '../hooks/useNotifications';

export function NotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [] } = useNotifications();
  const deleteNotif = useDeleteNotification();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deletingAll, setDeletingAll] = useState(false);

  if (!open) return null;

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить уведомление?')) deleteNotif.mutate(id);
  };

  const handleDeleteAll = async () => {
    if (!data.length) return;
    if (!window.confirm('Удалить все уведомления?')) return;
    try {
      setDeletingAll(true);
      await Promise.all(data.map((n) => deleteNotif.mutateAsync(n.id)));
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    } finally {
      setDeletingAll(false);
    }
  };

  const typeBadgeClass = (t: string) => {
    switch (t) {
      case 'CEU':
        return 'bg-green-600';
      case 'EXAM':
        return 'bg-blue-600';
      case 'PAYMENT':
        return 'bg-gray-700';
      case 'DOCUMENT':
        return 'bg-orange-600';
      case 'SUPERVISION':
        return 'bg-purple-600';
      case 'MENTORSHIP':
        return 'bg-indigo-600';
      default:
        return 'bg-gray-500';
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border shadow-sm w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-blue-dark">Уведомления</h2>
          <div className="flex items-center gap-2">
            {data.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="btn btn-danger"
                disabled={deletingAll || deleteNotif.isPending}
              >
                {deletingAll ? 'Удаляю…' : 'Удалить все'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-96 overflow-y-auto p-4">
          {data.length === 0 ? (
            <p className="text-sm text-gray-500">Нет новых уведомлений</p>
          ) : (
            data.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className="group flex items-start gap-3 bg-white border border-blue-dark/10 rounded-xl px-4 py-3 hover:shadow-sm hover:border-blue-dark/30 transition"
              >
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-white ${typeBadgeClass(
                    n.type as string,
                  )}`}
                >
                  {n.type}
                </span>

                <button
                  onClick={() => {
                    if (n.link) navigate(n.link);
                    onClose();
                  }}
                  className="text-left text-sm text-blue-dark hover:underline flex-1"
                  title={n.message}
                >
                  <div className="line-clamp-2">{n.message}</div>
                  {n.createdAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(n.id)}
                  className="ml-1 text-gray-400 hover:text-red-600 font-bold"
                  aria-label="Удалить"
                  title="Удалить"
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

  // Портал к <body>, чтобы избавиться от влияния контейнеров с padding/transform
  return createPortal(modal, document.body);
}
