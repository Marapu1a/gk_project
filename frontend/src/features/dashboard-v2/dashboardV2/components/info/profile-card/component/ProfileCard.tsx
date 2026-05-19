import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLogout } from '@/features/dashboard/hooks/useLogout';
import { useMyCertificates } from '@/features/certificate/hooks/useMyCertificates';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { NotificationModal } from '@/features/notifications/components/NotificationModal';

import { ProfileAvatar } from '../../profile-avatar/component/ProfileAvatar';
import { BellIcon } from '../icons/BellIcon';
import { EditIcon } from '../icons/EditIcon';
import { LogoutIcon } from '../icons/LogoutIcon';

type DashboardUser = {
  id: string;
  email: string;
  registrationNumber: string | null;
  fullName: string;
  avatarUrl: string | null;
  groupName?: string;
  targetLevelName?: string;
};

type ProfileCardProps = {
  user: DashboardUser;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  return {
    lastName: parts[0] ?? '',
    firstName: parts[1] ?? '',
    middleName: parts[2] ?? '',
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  const navigate = useNavigate();
  const logout = useLogout();

  const [openNotif, setOpenNotif] = useState(false);

  const { data: certificates = [] } = useMyCertificates();
  const { data: notifications = [] } = useNotifications();

  const { lastName, firstName, middleName } = splitFullName(user.fullName);
  const activeGroupName = user.groupName ?? '—';

  const currentCertificate = certificates.find((c) => c.isActiveNow) ?? certificates[0];

  const expiresAt = currentCertificate?.expiresAt
    ? new Date(currentCertificate.expiresAt).toLocaleDateString('ru-RU')
    : null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success('Email скопирован');
    } catch {
      toast.error('Не удалось скопировать email');
    }
  };

  return (
    <>
      <section className="card-section h-full min-h-[340px] w-full px-5 py-6 shadow-soft">
        <h2 className="dashboard-v2-title mb-4 text-center">Информация</h2>

        <div className="flex items-start gap-4">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <div className="flex min-w-0 flex-1 flex-col pt-1">
            <div className="min-w-0 leading-tight text-blue-dark">
              <p className="dashboard-v2-title break-words">{lastName}</p>
              <p className="dashboard-v2-label break-words font-medium">{firstName}</p>
              <p className="dashboard-v2-label break-words font-medium">{middleName}</p>
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[#1F305E]">
              <span className="dashboard-v2-small truncate font-medium" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center"
                title="Скопировать email"
                aria-label="Скопировать email"
              >
                <img src="/dashboard-v2/icon_copy.svg" alt="" className="h-[14px] w-[14px]" />
              </button>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn dashboard-v2-label h-[34px] w-full cursor-pointer rounded-full border border-[var(--color-blue-dark)] text-blue-dark hover:bg-[rgba(31,48,94,0.04)] active:bg-[rgba(31,48,94,0.08)]"
              >
                История
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={logout}
                aria-label="Выйти"
                className="icon-button icon-button-danger h-[42px] w-[42px]"
              >
                <LogoutIcon className="h-full w-full" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Редактировать профиль"
                className="icon-button icon-button-primary h-[42px] w-[42px]"
              >
                <EditIcon className="h-full w-full" />
              </button>

              <button
                type="button"
                onClick={() => setOpenNotif(true)}
                aria-label="Уведомления"
                className="icon-button icon-button-primary relative h-[42px] w-[42px]"
              >
                <BellIcon className="h-full w-full" />

                {unreadCount > 0 && (
                  <span className="badge badge-danger absolute -right-[4px] -top-[4px]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className="dashboard-v2-label dashboard-v2-level-pill mt-4"
        >
          {activeGroupName}
        </div>

        <div className="dashboard-v2-text mt-4 text-center" style={{ color: '#8D96B5' }}>
          Регистрационный номер:{' '}
          <span className="font-semibold text-blue-dark">{user.registrationNumber ?? '-'}</span>
        </div>

        <div className="dashboard-v2-text mt-2 text-center" style={{ color: '#8D96B5' }}>
          Срок действия сертификата:{' '}
          <span className="font-semibold text-[var(--color-danger)]">{expiresAt ?? '-'}</span>
        </div>

        <div className="dashboard-v2-caption mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/my-certificate')}
            className="btn btn-dark h-[44px] min-w-0 flex-1 cursor-pointer rounded-[12px] px-3 font-extrabold"
          >
            Мои сертификаты
          </button>

          <button
            type="button"
            onClick={() => navigate('/document-review')}
            className="btn btn-dark h-[44px] min-w-0 flex-1 cursor-pointer rounded-[12px] px-3 font-extrabold"
          >
            Мои документы
          </button>
        </div>
      </section>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />
    </>
  );
}
