// src/features/notifications/components/NotificationModal.tsx
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
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { NotificationMessage } from './NotificationMessage';
import { getUiErrorMessage, UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { formatDateRu, formatTimeRu } from '@/utils/dateFormat';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';
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
      toast.success(UI_TOAST_MESSAGES.admin.notificationDeleted);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.admin.notificationDeleteFailed));
    }
  };

  const handleMarkAllRead = async () => {
    if (!unread.length) return;

    try {
      await Promise.allSettled(unread.map((item) => markRead.mutateAsync(item.id)));
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(UI_TOAST_MESSAGES.admin.notificationsMarkedRead);
    } catch {
      toast.error(UI_TOAST_MESSAGES.admin.notificationsMarkReadFailed);
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
      toast.success(UI_TOAST_MESSAGES.admin.notificationsDeleted);
    } catch (error) {
      toast.error(getUiErrorMessage(error, UI_TOAST_MESSAGES.admin.notificationsDeleteFailed));
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabelledBy="notifications-modal-title"
      overlayClassName="z-50 bg-black/75 px-4 py-6"
      dialogClassName="relative flex h-[min(92vh,760px)] w-full max-w-[1060px] flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
    >
      <ModalCloseButton
        onClick={onClose}
        label="Закрыть уведомления"
        iconClassName="h-[30px] w-[30px]"
        className="z-10"
      />

      <header className="px-8 pb-5 pt-9 text-center">
        <h2
          id="notifications-modal-title"
          className="text-[28px] font-extrabold leading-tight text-[var(--color-blue-dark)]"
        >
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

          <footer className="flex shrink-0 items-center justify-between gap-4 bg-white/95 px-8 py-5 shadow-[0_-8px_20px_rgba(31,48,94,0.08)]">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!unread.length || markRead.isPending}
              className="btn flex h-[30px] cursor-pointer text-[15px] font-medium text-[#8D96B5] transition hover:text-[var(--color-blue-dark)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Отметить все прочитанным
            </button>

            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={!data.length || deleteAllNotif.isPending}
              className="btn flex h-[30px] cursor-pointer text-[15px] font-medium text-[var(--color-danger)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Удалить все уведомления
            </button>
          </footer>
        </>
      )}
    </ModalShell>
  );
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
  const date = formatDateRu(notification.createdAt);
  const time = formatTimeRu(notification.createdAt);
  const tone = NOTIFICATION_TYPE_TONES[notification.type] ?? 'soft';
  const label = NOTIFICATION_TYPE_LABELS[notification.type] ?? 'Уведомление';
  const normalizedLink = normalizeNotificationLink(
    notification.link,
    notification.type,
    notification.message,
  );

  return (
    <article
      className={`grid min-h-[92px] grid-cols-[minmax(0,1fr)_108px_48px_32px] items-center gap-4 border-b border-[var(--color-blue-soft)] px-4 py-3 transition ${
        notification.isRead ? 'bg-white' : 'bg-[#F4FAFB]'
      }`}
    >
      <div className="min-w-0 self-start">
        <NotificationBadge tone={tone}>{label}</NotificationBadge>
        <NotificationMessage
          message={notification.message}
          className="mt-2 text-[17px] leading-[1.22] text-[var(--color-blue-dark)]"
        />
      </div>

      <div className="text-right text-[15px] leading-[1.35] text-[#8D96B5]">
        <div>{date}</div>
        <div>{time}</div>
      </div>

      <ActionArrowButton
        onClick={onOpen}
        disabled={!normalizedLink && notification.isRead}
        size={40}
        className="notification-arrow"
        aria-label={normalizedLink ? 'Открыть уведомление' : 'Отметить прочитанным'}
      />

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center opacity-45 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Удалить уведомление"
      >
        <img src={EXIT_ICON} alt="" className="h-[20px] w-[20px]" />
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
      className={`inline-flex h-[26px] items-center rounded-full px-3 text-[14px] font-medium leading-none ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-20">
      <img src={EMPTY_ICON} alt="" className="h-[132px] w-[106px]" />
      <p className="mt-12 text-[18px] font-extrabold text-[#C0C5D2]">Новых событий нет</p>
    </div>
  );
}
