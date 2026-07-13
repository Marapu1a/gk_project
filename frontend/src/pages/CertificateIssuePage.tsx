import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { currentUserQueryKey } from '@/features/auth/hooks/useCurrentUser';
import { AdminIssueCertificateForm } from '@/features/certificate/components/AdminIssueCertificateForm';
import { PageNav } from '@/components/PageNav';

export default function CertificateIssuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultEmail = searchParams.get('email') ?? '';
  const { data: me, isLoading } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка…</p>;
  if (!me || me.role !== 'ADMIN')
    return <p className="text-[#FF5364]">403: Доступ только для админов</p>;

  return (
    <div className="min-h-screen bg-[#F0F0F0] px-2 pb-12 pt-4 sm:px-4">
      <div className="mx-auto w-full max-w-[1100px]">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="dashboard-v2-title text-center">Выдать сертификат</h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <div className="relative hidden sm:block">
          <div className="absolute left-0 top-0">
            <PageNav />
          </div>

          <h1 className="dashboard-v2-title text-center">Выдать сертификат</h1>
        </div>

        <div className="mt-8">
          <AdminIssueCertificateForm
            defaultEmail={defaultEmail}
            onSuccess={(report) =>
              navigate('/dashboard-v2', { state: { certificateIssued: report } })
            }
          />
        </div>
      </div>
    </div>
  );
}
