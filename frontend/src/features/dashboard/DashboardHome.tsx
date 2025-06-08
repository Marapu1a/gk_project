import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSupervisionSummary } from '@/hooks/useSupervisionSummary';
import { useCeuSummary } from '@/hooks/useCeuSummary';

import { UserInfo } from '@/components/dashboard/UserInfo';
import { SupervisionSummary } from '@/components/dashboard/SupervisionSummary';
import { CeuSummary } from '@/components/dashboard/CeuSummary';
import { CeuRecordsList } from '@/components/dashboard/CeuRecordsList';
import { ProgressTable } from '@/components/dashboard/ProgressTable';

export default function DashboardHome() {
  const { data: user } = useCurrentUser();
  const { data: summary } = useSupervisionSummary();
  const { data: ceuSummary } = useCeuSummary();

  if (!user || !summary || !ceuSummary) return <p>Загрузка...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>
      <UserInfo user={user} />
      <SupervisionSummary summary={summary} />
      <CeuSummary ceuSummary={ceuSummary} />
      <CeuRecordsList />
      <ProgressTable />
    </div>
  );
}
