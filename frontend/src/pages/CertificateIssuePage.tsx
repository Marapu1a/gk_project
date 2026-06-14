import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { AdminIssueCertificateForm } from '@/features/certificate/components/AdminIssueCertificateForm';
import { PageNav } from '@/components/PageNav';

export default function CertificateIssuePage() {
  const [searchParams] = useSearchParams();
  const defaultEmail = searchParams.get('email') ?? '';
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка…</p>;
  if (!me || me.role !== 'ADMIN')
    return <p className="text-[#FF5364]">403: Доступ только для админов</p>;

  return (
    <div className="min-h-screen bg-[#F0F0F0] px-4 pb-12 pt-4">
      <div className="relative mx-auto w-full max-w-[1100px]">
        <div className="absolute left-0 top-0">
          <PageNav />
        </div>

        <h1 className="dashboard-v2-title text-center">Выдать сертификат</h1>

        <div className="mt-8">
          <AdminIssueCertificateForm
            defaultEmail={defaultEmail}
            onSuccess={() => {
              /* при желании: инвалидация/тост */
            }}
          />
        </div>
      </div>
    </div>
  );
}
