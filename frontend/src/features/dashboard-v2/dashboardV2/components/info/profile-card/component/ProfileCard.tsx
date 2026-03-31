import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <>
      <section className="card-section max-w-[420px] px-5 py-5" style={{ borderRadius: '32px' }}>
        <h2 className="mb-5 text-center text-[18px] font-semibold text-blue-dark">Информация</h2>

        <div className="flex items-start gap-5">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <div className="flex min-w-0 flex-1 flex-col pt-1">
            <div className="min-w-0 leading-tight text-blue-dark">
              <p className="break-words text-[20px] font-semibold">{lastName}</p>
              <p className="break-words text-[18px]">{firstName}</p>
              <p className="break-words text-[18px]">{middleName}</p>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn h-[40px] w-full rounded-full border border-[var(--color-blue-dark)] text-[18px] text-blue-dark hover:bg-[rgba(31,48,94,0.04)] active:bg-[rgba(31,48,94,0.08)]"
              >
                История
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={logout}
                aria-label="Выйти"
                className="icon-button icon-button-danger h-[48px] w-[48px]"
              >
                <LogoutIcon className="h-full w-full" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Редактировать профиль"
                className="icon-button icon-button-primary h-[48px] w-[48px]"
              >
                <EditIcon className="h-full w-full" />
              </button>

              <button
                type="button"
                onClick={() => setOpenNotif(true)}
                aria-label="Уведомления"
                className="icon-button icon-button-primary relative h-[48px] w-[48px]"
              >
                <BellIcon className="h-full w-full" />

                {unreadCount > 0 && (
                  <span className="badge badge-pink absolute -right-[4px] -top-[4px]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className="mt-5 px-4 py-2 text-center text-[18px] font-semibold text-blue-dark"
          style={{
            backgroundColor: 'var(--color-blue-soft)',
            borderRadius: 'var(--radius-button)',
          }}
        >
          {activeGroupName}
        </div>

        <div className="mt-4 text-center text-[16px]" style={{ color: '#8D96B5' }}>
          Срок действия сертификата:{' '}
          <span className="font-semibold text-pink-accent">{expiresAt ?? '—'}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 text-[14px]">
          <button
            type="button"
            onClick={() => navigate('/my-certificate')}
            className="btn btn-dark min-w-0 flex-1 rounded-[16px] px-4 py-4"
          >
            Мои сертификаты
          </button>

          <button
            type="button"
            onClick={() => navigate('/document-review')}
            className="btn btn-dark min-w-0 flex-1 rounded-[16px] px-4 py-4"
          >
            Мои документы
          </button>
        </div>
      </section>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />
    </>
  );
}
