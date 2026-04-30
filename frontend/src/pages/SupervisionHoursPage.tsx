import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HoursOverviewBlock } from '@/features/dashboard-v2/dashboardV2/components/hours-overview/component/HoursOverviewBlock';
import { SupervisionHoursRequestForm } from '@/features/supervision/components/SupervisionHoursRequestForm';
import { SupervisionContractBlock } from '@/features/supervision/components/SupervisionContractBlock';
import { SupervisionRecordHistoryBlock } from '@/features/supervision/components/SupervisionRecordHistoryBlock';

function SupervisionHoursContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const panel = searchParams.get('panel');
  const isHistoryEntry = panel === 'history';

  useEffect(() => {
    if (!isHistoryEntry) return;

    const timeout = window.setTimeout(() => {
      document.getElementById('supervision-history')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isHistoryEntry]);

  return (
    <div className="container-fixed mx-auto px-5 py-4 sm:px-6">
      <header className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard-v2')}
          className="inline-flex h-[30px] min-w-[88px] items-center justify-center rounded-full border border-[#A7B1C7] px-3 text-[14px] font-medium text-[#1F305E] hover:bg-white active:bg-[#E7F1F4]"
        >
          ← Профиль
        </button>

        <h1 className="min-w-0 text-center text-[22px] font-extrabold leading-tight text-[#1F305E]">
          Часы супервизии
        </h1>

        <div className="hidden min-w-[88px] sm:block" aria-hidden="true" />
      </header>

      <HoursOverviewBlock showActions={false} />

      <SupervisionHoursRequestForm defaultOpen={!isHistoryEntry} />
      <SupervisionContractBlock defaultOpen={false} />
      <SupervisionRecordHistoryBlock />
    </div>
  );
}

export default function SupervisionHoursPage() {
  return (
    <ProtectedRoute>
      <SupervisionHoursContent />
    </ProtectedRoute>
  );
}
