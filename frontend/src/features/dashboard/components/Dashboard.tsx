import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { UserInfo } from './UserInfo';
import { ProgressSummary } from './ProgressSummary';
import { DashboardTabs } from './DashboardTabs';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationModal } from '@/features/notifications/components/NotificationModal';

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

  const [openNotif, setOpenNotif] = useState(false);

  if (isLoading) return <p>Загрузка...</p>;
  if (isError || !user) return <p className="text-error">Не удалось загрузить данные</p>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-end">
        <NotificationBell onClick={() => setOpenNotif(true)} />
      </div>

      <NotificationModal open={openNotif} onClose={() => setOpenNotif(false)} />

      <h1 className="text-3xl font-bold text-blue-dark">Личный кабинет</h1>

      <DashboardTabs user={user} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <UserInfo user={user} />
        </div>
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <ProgressSummary />
        </div>
      </div>
    </div>
  );
}
