import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCeuSummary } from '@/hooks/useCeuSummary';

import { UserInfo } from '@/components/dashboard/UserInfo';
import { ProgressTable } from '@/components/dashboard/ProgressTable';

export default function DashboardHome() {
  const { data: user } = useCurrentUser();
  const { data: ceuSummary } = useCeuSummary();

  if (!user || !ceuSummary) return <p>Загрузка...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>
      <UserInfo user={user} />
      <ProgressTable />
    </div>
  );
}
