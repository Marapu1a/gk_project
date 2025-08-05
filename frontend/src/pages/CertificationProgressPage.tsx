import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { QualificationStatusBlock } from '@/features/certificate/components/QualificationStatusBlock';

export default function CertificationProgressPage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка данных...</p>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark">Статус сертификации</h1>
      <QualificationStatusBlock activeGroupName={user?.activeGroup?.name} />
    </div>
  );
}
