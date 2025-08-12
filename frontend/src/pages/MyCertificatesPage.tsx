import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { MyCertificatesBlock } from '@/features/certificate/components/MyCertificatesBlock';
import { BackButton } from '@/components/BackButton';

export default function MyCertificatesPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка…</p>;
  if (!me) return <p className="text-red-600">401: Не авторизован</p>;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-dark">Мои сертификаты</h1>
        <BackButton />
      </div>
      <MyCertificatesBlock />
    </div>
  );
}
