// src/features/progress/components/ProgressSummary.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  соискатель: 'Инструктор',
  инструктор: 'Куратор',
  куратор: 'Супервизор',
  супервизор: 'Опытный Супервизор',
  'опытный супервизор': null,
};

const RU_BY_LEVEL: Record<'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR', string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

export function ProgressSummary() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const activeGroupName = user?.activeGroup?.name ?? null;
  const activeGroupLc = activeGroupName?.toLowerCase() ?? null;
  const activeCycleType = user?.activeCycle?.type ?? null;

  const isAdmin = user?.role === 'ADMIN';
  const isRenewalCycle = activeCycleType === 'RENEWAL';

  const explicitTargetRu = user?.targetLevel ? RU_BY_LEVEL[user.targetLevel] : null;
  const ladderTarget = activeGroupLc ? GROUP_PROGRESS_PATH[activeGroupLc] : null;
  const targetToShow = explicitTargetRu ?? ladderTarget;

  const isSupervisor = activeGroupLc === 'супервизор';
  const isSeniorSupervisor = activeGroupLc === 'опытный супервизор';
  const isSupervisorLike = isSupervisor || isSeniorSupervisor;

  const ceuLevelForRequirements = isSupervisorLike ? undefined : (user?.targetLevel ?? undefined);

  const shouldShowSupervisionSummary = !!user && !isSeniorSupervisor;

  if (isAdmin) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
          <h2 className="text-xl font-semibold text-blue-dark">Прогресс CEU и супервизии</h2>
        </div>

        <div className="px-6 py-5 text-sm">
          <p className="text-gray-700">
            Для администраторов индивидуальный прогресс CEU и часов супервизии здесь не
            отображается.
          </p>
          <p className="mt-1 text-gray-600">Позже здесь будет администраторская сводка.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h2 className="text-xl font-semibold text-blue-dark">Прогресс CEU и супервизии</h2>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4 text-sm">
        {targetToShow && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Активный цикл:{' '}
              <strong>
                {isRenewalCycle
                  ? `ресертификация уровня «${targetToShow}»`
                  : `сертификация на уровень «${targetToShow}»`}
              </strong>
            </p>
          </div>
        )}

        <CeuSummaryBlock level={ceuLevelForRequirements} />

        {shouldShowSupervisionSummary && <SupervisionSummaryBlock user={user!} />}
      </div>
    </div>
  );
}
