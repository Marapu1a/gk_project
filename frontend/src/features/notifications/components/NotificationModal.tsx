// src/features/notifications/components/NotificationModal.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications, useDeleteNotification } from '../hooks/useNotifications';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [] } = useNotifications();
  const deleteNotif = useDeleteNotification();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deletingAll, setDeletingAll] = useState(false);

  if (!open) return null;

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const handleDelete = async (id: string) => {
    if (!(await confirmToast('Удалить уведомление?'))) return;
    try {
      await deleteNotif.mutateAsync(id);
      toast.success('Уведомление удалено');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось удалить уведомление');
    }
  };

  const handleDeleteAll = async () => {
    if (!data.length) return;
    if (!(await confirmToast('Удалить все уведомления?'))) return;
    try {
      setDeletingAll(true);
      await Promise.allSettled(data.map((n) => deleteNotif.mutateAsync(n.id)));
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Все уведомления удалены');
    } catch {
      toast.error('Не все уведомления удалось удалить');
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
      <div
        className="w-full max-w-md rounded-2xl border bg-white header-shadow overflow-hidden"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
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
              className="text-gray-400 hover:text-gray-600"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
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
                className="group flex items-start gap-3 bg-white border rounded-xl px-4 py-3 hover:shadow-sm transition"
                style={{ borderColor: 'var(--color-green-light)' }}
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
                  className="ml-1 text-gray-400 hover:text-red-600"
                  aria-label="Удалить"
                  title="Удалить"
                  disabled={deleteNotif.isPending}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
