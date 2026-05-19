import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { HoursOverviewBlock } from '@/features/dashboard-v2/dashboardV2/components/hours-overview/component/HoursOverviewBlock';
import { MentorshipHoursRequestForm } from '@/features/supervision/components/MentorshipHoursRequestForm';
import { SupervisionHoursRequestForm } from '@/features/supervision/components/SupervisionHoursRequestForm';
import { SupervisionContractBlock } from '@/features/supervision/components/SupervisionContractBlock';
import { SupervisionRecordHistoryBlock } from '@/features/supervision/components/SupervisionRecordHistoryBlock';

function SupervisionHoursContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const panel = searchParams.get('panel');
  const isHistoryEntry = panel === 'history';
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const groupNames = user?.groups?.map((group) => group.name) ?? [];
  const isMentorshipMode = groupNames.includes('Супервизор');
  const isExperiencedSupervisor = groupNames.includes('Опытный Супервизор');

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
          {isMentorshipMode ? 'Часы менторства' : 'Часы супервизии'}
        </h1>

        {isMentorshipMode ? (
          <div className="hidden min-w-[88px] sm:block" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={() => setIsContractModalOpen(true)}
            className="inline-flex min-h-[30px] min-w-[88px] items-center justify-center rounded-full border border-[#A7B1C7] px-3 text-center text-[13px] font-medium leading-tight text-[#1F305E] transition-colors hover:bg-white active:bg-[#E7F1F4] sm:text-[14px]"
          >
            Контракты
          </button>
        )}
      </header>

      <HoursOverviewBlock showActions={false} />

      {isMentorshipMode ? (
        <MentorshipHoursRequestForm defaultOpen={!isHistoryEntry} />
      ) : isExperiencedSupervisor ? (
        <section className="mt-5 rounded-[16px] bg-white px-5 py-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
          <h2 className="text-[18px] font-extrabold text-[#1F305E]">
            Часы менторства не требуются
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[14px] leading-[1.45] text-[#6B7894]">
            Опытные супервизоры набирают только CEU-баллы непрерывного образования.
          </p>
        </section>
      ) : (
        <>
          <SupervisionHoursRequestForm defaultOpen={!isHistoryEntry} />
          <SupervisionContractBlock
            open={isContractModalOpen}
            onClose={() => setIsContractModalOpen(false)}
          />
        </>
      )}

      {!isExperiencedSupervisor ? (
        <SupervisionRecordHistoryBlock mode={isMentorshipMode ? 'mentorship' : 'supervision'} />
      ) : null}
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
