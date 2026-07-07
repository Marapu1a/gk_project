import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useMyCertificates } from '@/features/certificate/hooks/useMyCertificates';
import { formatCertificateDate } from '@/features/certificate/utils/certificateDates';
import { NotificationBellButton } from '@/features/notifications/components/NotificationBellButton';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { useSpecialistContactMessages } from '@/features/registry/hooks/useSpecialistContactMessages';

import { ProfileAvatar } from '../../profile-avatar/component/ProfileAvatar';
import { EditIcon } from '../icons/EditIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { MailIcon } from '../icons/MailIcon';
import { DashboardNavRow } from '../../../DashboardNavRow';

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

  const { data: certificates = [] } = useMyCertificates();
  const { data: contactMessages } = useSpecialistContactMessages();

  const { lastName, firstName, middleName } = splitFullName(user.fullName);
  const activeGroupName = user.groupName ?? '—';

  const currentCertificate = certificates.find((c) => c.isActiveNow) ?? certificates[0];

  const expiresAt = currentCertificate?.expiresAt
    ? formatCertificateDate(currentCertificate.expiresAt)
    : null;

  const unreadContactCount = contactMessages?.unreadCount ?? 0;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success(UI_TOAST_MESSAGES.admin.emailCopied);
    } catch {
      toast.error(UI_TOAST_MESSAGES.admin.emailCopyFailed);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {/* Десктоп/планшет */}
      <section className="card-section hidden h-full min-h-[340px] w-full px-5 py-6 shadow-soft lg:block">
        <h2 className="dashboard-v2-title mb-4 text-center">Информация</h2>

        <div className="flex items-start gap-4">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <div className="flex min-h-[152px] min-w-0 flex-1 flex-col pt-1">
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

            <div className="mt-auto grid grid-cols-4 gap-2 pt-3">
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
                onClick={() => navigate('/specialist-messages')}
                aria-label="Сообщения специалисту"
                className="icon-button icon-button-primary relative h-[42px] w-[42px]"
              >
                <MailIcon className="h-full w-full" />

                {unreadContactCount > 0 && (
                  <span className="badge badge-danger absolute -right-[4px] -top-[4px]">
                    {unreadContactCount > 99 ? '99+' : unreadContactCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Редактировать профиль"
                className="icon-button icon-button-primary h-[42px] w-[42px]"
              >
                <EditIcon className="h-full w-full" />
              </button>

              <NotificationBellButton />
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

      {/* Мобильная версия — компактная карточка + строки-ссылки */}
      <section className="card-section w-full px-4 py-4 shadow-soft lg:hidden">
        <div className="flex flex-col items-center text-center">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <p className="dashboard-v2-text mt-2 font-semibold leading-snug text-blue-dark">
            {user.fullName}
          </p>
        </div>

        <div className="dashboard-v2-label dashboard-v2-level-pill mt-3">{activeGroupName}</div>

        <div className="dashboard-v2-text mt-3 text-center" style={{ color: '#8D96B5' }}>
          Действует до:{' '}
          <span className="font-semibold text-[var(--color-danger)]">{expiresAt ?? '-'}</span>
        </div>
      </section>

      <div className="space-y-2 lg:hidden">
        <DashboardNavRow label="Мои сертификаты" onClick={() => navigate('/my-certificate')} />
        <DashboardNavRow label="Мои документы" onClick={() => navigate('/document-review')} />
      </div>
    </div>
  );
}
