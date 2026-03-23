// src/features/dashboard-v2/components/DashboardV2.tsx
import { ProfileAvatar } from '../../profile-avatar/component/ProfileAvatar';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export function DashboardV2() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="container-fixed p-6">
        <div className="card-section">
          <p className="text-sm text-blue-dark">Загрузка…</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed p-6">
        <div className="card-section">
          <p className="text-sm text-error">Не удалось загрузить пользователя</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed p-6">
      <div className="card-section">
        <div className="flex items-start gap-6">
          <ProfileAvatar userId={user.id} avatarUrl={user.avatarUrl} fullName={user.fullName} />

          <div>
            <h1 className="text-2xl font-semibold text-blue-dark">Личный кабинет V2</h1>
            <p className="mt-2 text-sm text-gray-600">Новая версия кабинета в разработке.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
