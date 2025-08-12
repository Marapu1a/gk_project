import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { AdminIssueCertificateForm } from '@/features/certificate/components/AdminIssueCertificateForm';
import { BackButton } from '@/components/BackButton';

export default function CertificateIssuePage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка…</p>;
  if (!me || me.role !== 'ADMIN')
    return <p className="text-red-600">403: Доступ только для админов</p>;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-dark">Выдать сертификат</h1>
        <BackButton />
      </div>

      <AdminIssueCertificateForm
        onSuccess={() => {
          /* при желании: инвалидация/тост */
        }}
      />
    </div>
  );
}
