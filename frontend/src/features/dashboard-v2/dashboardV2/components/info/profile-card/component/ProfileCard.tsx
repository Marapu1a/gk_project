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
      <section className="card-section h-full min-h-[340px] w-full px-5 py-6 shadow-soft">
        <h2 className="dashboard-v2-title mb-4 text-center">Информация</h2>

        <div className="flex items-start gap-4">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <div className="flex min-w-0 flex-1 flex-col pt-1">
            <div className="min-w-0 leading-tight text-blue-dark">
              <p className="break-words text-[18px] font-extrabold">{lastName}</p>
              <p className="break-words text-[16px]">{firstName}</p>
              <p className="break-words text-[16px]">{middleName}</p>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn h-[34px] w-full cursor-pointer rounded-full border border-[var(--color-blue-dark)] text-[15px] text-blue-dark hover:bg-[rgba(31,48,94,0.04)] active:bg-[rgba(31,48,94,0.08)]"
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
                  <span className="badge badge-pink absolute -right-[4px] -top-[4px]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className="mt-4 h-[38px] px-4 py-2 text-center text-[16px] font-semibold text-blue-dark"
          style={{
            backgroundColor: 'var(--color-blue-soft)',
            borderRadius: '10px',
          }}
        >
          {activeGroupName}
        </div>

        <div className="mt-4 text-center text-[14px]" style={{ color: '#8D96B5' }}>
          Срок действия сертификата:{' '}
          <span className="font-semibold text-pink-accent">{expiresAt ?? '—'}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
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
