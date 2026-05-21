import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import { ArrowRight, DatabaseBackup, Download, LogOut, Settings, Trash2, X } from 'lucide-react';

import { useLogout } from '@/features/dashboard/hooks/useLogout';
import {
  useNotifications,
  useDeleteNotification,
  useMarkNotificationRead,
} from '@/features/notifications/hooks/useNotifications';
import { NotificationMessage } from '@/features/notifications/components/NotificationMessage';
import type { Notification } from '@/features/notifications/api/notifications';
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONES,
  normalizeNotificationLink,
  type NotificationTone,
} from '@/utils/notificationDictionary';
import { useAllDocReviewRequests } from '@/features/documentReviewAdmin/hooks/useAllDocReviewRequests';
import { useAdminCeuHistory } from '@/features/admin/hooks/ceu/useAdminCeuHistory';
import { useAdminReviewerCandidates } from '@/features/admin/hooks/supervision/useAdminReviewerCandidates';
import { useExamApps } from '@/features/exam/hooks/useExamApps';
import { useDownloadUsersExport } from '@/features/admin/hooks/useDownloadUsersExport';
import { useCreateDbBackup } from '@/features/backup/hooks/useCreateDbBackup';

type AdminDashboardProps = {
  user: {
    email: string;
  };
};

type TaskItem = {
  label: string;
  to: string;
  count?: number | null;
};

type DocumentReviewRequestRow = {
  status: string;
  documentFiles?: { status: string; deletionRequestedAt?: string | null }[];
};

const activeDocumentStatuses = new Set(['UNCONFIRMED', 'PARTIALLY_CONFIRMED']);

export function AdminDashboard({ user }: AdminDashboardProps) {
  const logout = useLogout();
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotifications();
  const { data: documentRequests = [] } = useAllDocReviewRequests();
  const ceuHistory = useAdminCeuHistory({
    status: 'UNCONFIRMED',
    page: 1,
    perPage: 1,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const supervisionCandidates = useAdminReviewerCandidates({
    kind: 'supervision',
    attention: true,
    page: 1,
    perPage: 1,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const mentorshipCandidates = useAdminReviewerCandidates({
    kind: 'mentorship',
    attention: true,
    page: 1,
    perPage: 1,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const examApps = useExamApps();
  const exportUsers = useDownloadUsersExport();
  const backupDb = useCreateDbBackup();

  const documentCount = (documentRequests as DocumentReviewRequestRow[]).filter((request) => {
    const hasActiveStatus = activeDocumentStatuses.has(request.status);
    const hasDeletionRequest = request.documentFiles?.some(
      (file) => file.deletionRequestedAt && file.status !== 'DELETED',
    );
    return hasActiveStatus || hasDeletionRequest;
  }).length;

  const ceuCount = ceuHistory.data?.total ?? null;
  const supervisionHoursCount =
    supervisionCandidates.data && mentorshipCandidates.data
      ? supervisionCandidates.data.total + mentorshipCandidates.data.total
      : null;
  const examCount =
    examApps.data?.filter((application) => application.status === 'PENDING').length ?? null;

  const tasks: TaskItem[] = [
    { label: 'Управление пользователями', to: '/users' },
    { label: 'Баннер для пользователей', to: '/admin/user-banner' },
    { label: 'Проверка документов', to: '/admin/document-review', count: documentCount },
    { label: 'Проверка CEU', to: '/review/ceu', count: ceuCount },
    { label: 'Проверка часов', to: '/admin/supervision-candidates', count: supervisionHoursCount },
    { label: 'Выдача сертификата', to: '/certificate' },
    { label: 'Заявки на экзамен', to: '/exam-applications', count: examCount },
  ];

  const onExportUsers = async () => {
    try {
      await exportUsers.mutateAsync();
      toast.success('Выгрузка пользователей скачана');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось выгрузить пользователей');
    }
  };

  const onBackupDb = async () => {
    try {
      const result = await backupDb.mutateAsync();
      toast.success(`Бэкап скачан: ${result.file}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Не удалось создать бэкап');
    }
  };

  return (
    <div className="container-fixed px-4 pb-10 pt-3 text-blue-dark md:px-6">
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div />
        <h1 className="dashboard-v2-page-title text-center">
          Панель администратора
        </h1>
        <div className="dashboard-v2-small flex min-w-0 items-center justify-end gap-3 text-[#8D96B5]">
          <span className="hidden max-w-[260px] truncate sm:block">{user.email}</span>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--color-blue-dark)] transition-colors hover:bg-[var(--color-blue-soft)]"
            aria-label="Управление"
            title="Управление"
          >
            <Settings size={22} />
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)] hover:text-white"
            aria-label="Выйти"
            title="Выйти"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      <div className="grid w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 lg:grid-rows-[1fr_auto]">
          <AdminPanel title="Рабочие задачи" className="h-full px-0 py-4">
            <nav className="mt-1">
              {tasks.map((task) => (
                <TaskLink key={task.to} task={task} />
              ))}
            </nav>
          </AdminPanel>

          <AdminPanel title="Отчёты и выгрузки" className="px-0 py-4">
            <div className="mt-1 space-y-1">
              <ActionButton
                icon={<Download size={16} />}
                label="Выгрузка XLSX"
                onClick={onExportUsers}
                disabled={exportUsers.isPending}
              />
              <ActionButton
                icon={<DatabaseBackup size={16} />}
                label="Резервная копия БД"
                onClick={onBackupDb}
                disabled={backupDb.isPending}
              />
            </div>
          </AdminPanel>
        </div>

        <AdminPanel title="Уведомления" className="min-w-0 px-0 py-4">
          <AdminNotifications notifications={notifications} />
        </AdminPanel>
      </div>
    </div>
  );
}

function AdminPanel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-section shadow-soft ${className}`}>
      <h2 className="dashboard-v2-title px-5 text-center">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TaskLink({ task }: { task: TaskItem }) {
  return (
    <Link
      to={task.to}
      className="dashboard-v2-text flex min-h-[44px] items-center justify-between gap-3 px-5 py-2 text-[#222] transition hover:bg-[var(--color-blue-soft)]"
    >
      <span>{task.label}</span>
      {typeof task.count === 'number' && task.count > 0 ? <TaskBadge count={task.count} /> : null}
    </Link>
  );
}

function TaskBadge({ count }: { count: number }) {
  return (
    <span className="dashboard-v2-small inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--color-danger)] px-2 text-white">
      {count > 99 ? '99' : count}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="dashboard-v2-text flex min-h-[48px] w-full items-center gap-3 px-5 py-2 text-left text-[#222] transition hover:bg-[var(--color-blue-soft)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-[#8D96B5]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AdminNotifications({ notifications }: { notifications: Notification[] }) {
  if (!notifications.length) {
    return (
      <div className="dashboard-v2-text flex min-h-[180px] items-center justify-center px-4 text-center text-[#8D96B5]">
        Новых событий нет
      </div>
    );
  }

  return (
    <div className="notification-scroll mt-3 max-h-[430px] overflow-y-auto pr-1">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const navigate = useNavigate();
  const deleteNotification = useDeleteNotification();
  const markRead = useMarkNotificationRead();

  const createdAt = new Date(notification.createdAt);
  const date = Number.isNaN(createdAt.getTime()) ? '—' : createdAt.toLocaleDateString('ru-RU');
  const time = Number.isNaN(createdAt.getTime())
    ? '—'
    : createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const label = NOTIFICATION_TYPE_LABELS[notification.type] ?? 'Уведомление';
  const tone = NOTIFICATION_TYPE_TONES[notification.type] ?? 'soft';
  const normalizedLink = normalizeNotificationLink(
    notification.link,
    notification.type,
    notification.message,
  );

  const onOpen = async () => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }

    if (normalizedLink) {
      navigate(normalizedLink);
    }
  };

  const onDelete = async () => {
    try {
      await deleteNotification.mutateAsync(notification.id);
      toast.success('Уведомление удалено');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить уведомление');
    }
  };

  return (
    <article
      className={`grid min-h-[72px] grid-cols-[minmax(0,1fr)_104px_38px_32px] items-center gap-3 px-5 py-3 transition ${
        notification.isRead ? 'bg-white' : 'bg-[var(--color-blue-soft)]'
      }`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <NotificationBadge tone={tone}>{label}</NotificationBadge>
          {!notification.isRead ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-danger)]"
              aria-label="Не прочитано"
            />
          ) : null}
        </div>
        <NotificationMessage
          message={notification.message}
          className="dashboard-v2-text mt-1 text-[#222]"
          truncate
        />
      </div>

      <div className="dashboard-v2-caption text-right text-[#8D96B5]">
        <div>{date}</div>
        <div>{time}</div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-blue-darker)] disabled:opacity-45"
        disabled={!normalizedLink && notification.isRead}
        aria-label={normalizedLink ? 'Открыть уведомление' : 'Отметить прочитанным'}
      >
        <ArrowRight size={18} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleteNotification.isPending}
        className="flex h-[32px] w-[32px] items-center justify-center text-[#C0C5D2] transition hover:text-[var(--color-danger)] disabled:opacity-40"
        aria-label="Удалить уведомление"
      >
        {notification.type === 'USER' ? <X size={19} /> : <Trash2 size={16} />}
      </button>
    </article>
  );
}

function NotificationBadge({ tone, children }: { tone: NotificationTone; children: string }) {
  const className =
    tone === 'dark'
      ? 'bg-[var(--color-blue-dark)] text-white'
      : tone === 'danger'
        ? 'bg-[var(--color-danger)] text-white'
        : 'bg-[var(--color-blue-soft)] text-[var(--color-blue-dark)]';

  return (
    <span
      className={`dashboard-v2-small inline-flex h-[24px] max-w-[180px] shrink-0 items-center truncate rounded-full px-3 ${className}`}
    >
      {children}
    </span>
  );
}
