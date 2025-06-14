// src/features/dashboard/components/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { UserInfo } from './UserInfo';
import { ProgressSummary } from './ProgressSummary';
import { DashboardTabs } from './DashboardTabs';

export function Dashboard() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка...</p>;
  if (isError || !user) return <p className="text-error">Не удалось загрузить данные</p>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Личный кабинет</h1>

      <DashboardTabs />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UserInfo user={user} />
        <ProgressSummary user={user} />
      </div>
    </div>
  );
}
