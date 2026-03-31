import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { ProfileCard } from './info/profile-card/component/ProfileCard';
import { PaymentBlock } from './payment/component/PaymentBlock';
import { CertificationBlock } from './certification-block/component/CertificationBlock';

const TARGET_LEVEL_LABELS = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
} as const;

export function DashboardV2() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="container-fixed p-6">
        <p className="text-sm text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed p-6">
        <p className="text-sm text-error">Не удалось загрузить дашборд</p>
      </div>
    );
  }

  const activeGroupName = user.activeGroup?.name ?? '';
  const targetLevelName = user.targetLevel ? TARGET_LEVEL_LABELS[user.targetLevel] : undefined;

  return (
    <div className="container-fixed p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        <div className="min-w-0">
          <ProfileCard
            user={{
              id: user.id,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
              groupName: activeGroupName,
              targetLevelName,
            }}
          />
        </div>

        <div className="min-w-0">
          <PaymentBlock activeGroupName={activeGroupName} targetLevelName={targetLevelName} />
        </div>

        <div className="min-w-0">
          <CertificationBlock user={user} />
        </div>
      </div>
    </div>
  );
}
