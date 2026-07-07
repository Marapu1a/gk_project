import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageNav } from '@/components/PageNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { CeuPointsHistoryBlock } from '@/features/ceu/components/CeuPointsHistoryBlock';
import { CeuPointsRequestForm } from '@/features/ceu/components/CeuPointsRequestForm';
import { CeuOverviewBlock } from '@/features/dashboard-v2/dashboardV2/components/ceu-overview/component/CeuOverviewBlock';

function CeuPointsContent() {
  const [searchParams] = useSearchParams();
  const { data: user, isLoading, isError } = useCurrentUser();
  const isHistoryEntry = searchParams.get('panel') === 'history';

  useEffect(() => {
    if (!isHistoryEntry) return;

    const timeout = window.setTimeout(() => {
      document.getElementById('ceu-history')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isHistoryEntry]);

  if (isLoading) {
    return (
      <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
        <p className="text-sm text-blue-dark">Загрузка...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
        <p className="text-sm text-error">Не удалось загрузить CEU-баллы</p>
      </div>
    );
  }

  return (
    <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
      <div className="mb-5">
        {/* Мобильная версия — навигация над заголовком */}
        <div className="sm:hidden">
          <PageNav className="mb-3" />
          <h1 className="text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
            CEU-Баллы
          </h1>
        </div>

        {/* Десктоп/планшет — без изменений относительно исходной вёрстки */}
        <header className="hidden grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 sm:grid">
          <PageNav />

          <h1 className="min-w-0 text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
            CEU-Баллы
          </h1>

          <div className="hidden min-w-[207px] sm:block" aria-hidden="true" />
        </header>
      </div>

      <CeuOverviewBlock level={user.targetLevel} showActions={false} />

      <CeuPointsRequestForm defaultOpen={!isHistoryEntry} />
      <CeuPointsHistoryBlock />
    </div>
  );
}

export default function CeuPointsPage() {
  return (
    <ProtectedRoute>
      <CeuPointsContent />
    </ProtectedRoute>
  );
}
