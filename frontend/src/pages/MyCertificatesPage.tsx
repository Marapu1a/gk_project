import { useQuery } from '@tanstack/react-query';

import { PageNav } from '@/components/PageNav';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { MyCertificatesBlock } from '@/features/certificate/components/MyCertificatesBlock';

export default function MyCertificatesPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-[#F0F0F0] p-6 text-blue-dark">Загрузка...</div>;
  }

  if (!me) {
    return <div className="min-h-screen bg-[#F0F0F0] p-6 text-[#FF5364]">401: Не авторизован</div>;
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] px-2 pb-12 pt-4 text-blue-dark sm:px-5">
      <PageNav className="mb-4" />

      <header className="mb-7 text-center">
        <h1 className="text-[28px] font-extrabold leading-none text-[var(--color-blue-dark)]">
          Мои сертификаты
        </h1>
      </header>

      <main className="mx-auto max-w-[1160px]">
        <MyCertificatesBlock />
      </main>
    </div>
  );
}
