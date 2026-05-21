// src/features/notifications/components/NotificationModal.tsx
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  useNotifications,
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkNotificationRead,
} from '../hooks/useNotifications';
import type { Notification } from '../api/notifications';
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONES,
  normalizeNotificationLink,
  type NotificationTone,
} from '@/utils/notificationDictionary';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { NotificationMessage } from './NotificationMessage';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
const ARROW_ICON = '/dashboard-v2/button_X_mini.svg';
const EMPTY_ICON = '/dashboard-v2/icon_notification_bell.svg';

export function NotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [] } = useNotifications();
  const deleteNotif = useDeleteNotification();
  const deleteAllNotif = useDeleteAllNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  if (!open) return null;

  const unread = data.filter((item) => !item.isRead);

  const handleOpen = async (notification: (typeof data)[number]) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }

    const normalizedLink = normalizeNotificationLink(
      notification.link,
      notification.type,
      notification.message,
    );

    if (normalizedLink) {
      navigate(normalizedLink);
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: 'Удалить уведомление?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteNotif.mutateAsync(id);
      toast.success('Уведомление удалено');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить уведомление');
    }
  };

  const handleMarkAllRead = async () => {
    if (!unread.length) return;

    try {
      await Promise.allSettled(unread.map((item) => markRead.mutateAsync(item.id)));
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Уведомления отмечены прочитанными');
    } catch {
      toast.error('Не удалось отметить все уведомления');
    }
  };

  const handleDeleteAll = async () => {
    if (!data.length) return;

    const ok = await confirm({
      message: 'Удалить все уведомления?',
      description: 'Это действие очистит весь список уведомлений.',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await deleteAllNotif.mutateAsync();
      toast.success('Уведомления удалены');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить уведомления');
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <section className="relative flex h-[min(92vh,760px)] w-full max-w-[1060px] flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-8 top-8 z-10 flex h-[42px] w-[42px] cursor-pointer items-center justify-center opacity-80 transition hover:opacity-100"
          aria-label="Закрыть уведомления"
        >
          <img src={EXIT_ICON} alt="" className="h-[38px] w-[38px]" />
        </button>

        <header className="px-8 pb-6 pt-10 text-center">
          <h2 className="text-[40px] font-extrabold leading-none text-[var(--color-blue-dark)]">
            Уведомления
          </h2>
        </header>

        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mx-8 h-[3px] shrink-0 bg-[var(--color-blue-soft)]" />

            <div className="notification-scroll min-h-0 flex-1 overflow-y-auto px-8">
              {data.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={() => handleOpen(notification)}
                  onDelete={() => handleDelete(notification.id)}
                  deleting={deleteNotif.isPending}
                />
              ))}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-4 bg-white/95 px-8 py-6 shadow-[0_-8px_20px_rgba(31,48,94,0.08)]">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={!unread.length || markRead.isPending}
                className="btn flex h-[34px] cursor-pointer text-[24px] font-medium text-[#8D96B5] transition hover:text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Отметить все прочитанным
              </button>

              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={!data.length || deleteAllNotif.isPending}
                className="btn flex h-[34px] cursor-pointer text-[24px] font-medium text-[var(--color-danger)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Удалить все уведомления
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
  deleting,
}: {
  notification: Notification;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const createdAt = new Date(notification.createdAt);
  const date = Number.isNaN(createdAt.getTime()) ? '—' : createdAt.toLocaleDateString('ru-RU');
  const time = Number.isNaN(createdAt.getTime())
    ? '—'
    : createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const tone = NOTIFICATION_TYPE_TONES[notification.type] ?? 'soft';
  const label = NOTIFICATION_TYPE_LABELS[notification.type] ?? 'Уведомление';
  const normalizedLink = normalizeNotificationLink(
    notification.link,
    notification.type,
    notification.message,
  );

  return (
    <article
      className={`grid min-h-[114px] grid-cols-[minmax(0,1fr)_140px_64px_42px] items-center gap-4 border-b-[3px] border-[var(--color-blue-soft)] px-4 py-4 transition ${
        notification.isRead ? 'bg-white' : 'bg-[#F4FAFB]'
      }`}
    >
      <div className="min-w-0 self-start">
        <NotificationBadge tone={tone}>{label}</NotificationBadge>
        <NotificationMessage
          message={notification.message}
          className="mt-3 text-[26px] leading-[1.18] text-[#222]"
        />
      </div>

      <div className="text-right text-[24px] leading-[1.45] text-[#8D96B5]">
        <div>{date}</div>
        <div>{time}</div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={!normalizedLink && notification.isRead}
        className={`notification-arrow h-[53px] w-[53px] cursor-pointer rounded-[19px] transition disabled:cursor-default ${
          notification.isRead ? 'opacity-45' : 'opacity-100'
        }`}
        aria-label={normalizedLink ? 'Открыть уведомление' : 'Отметить прочитанным'}
      >
        <img src={ARROW_ICON} alt="" className="h-full w-full" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center opacity-45 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Удалить уведомление"
      >
        <img src={EXIT_ICON} alt="" className="h-[26px] w-[26px]" />
      </button>
    </article>
  );
}

function NotificationBadge({ tone, children }: { tone: NotificationTone; children: string }) {
  const className =
    tone === 'dark'
      ? 'bg-[var(--color-blue-dark)] text-white'
      : tone === 'danger'
        ? 'bg-[rgba(255,83,100,0.36)] text-[var(--color-blue-dark)]'
        : 'bg-[#C7D8FF] text-[var(--color-blue-dark)]';

  return (
    <span
      className={`inline-flex h-[40px] items-center rounded-full px-4 text-[26px] font-medium leading-none ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-20">
      <img src={EMPTY_ICON} alt="" className="h-[173px] w-[140px]" />
      <p className="mt-[110px] text-[28px] font-extrabold text-[#C0C5D2]">Новых событий нет</p>
    </div>
  );
}
