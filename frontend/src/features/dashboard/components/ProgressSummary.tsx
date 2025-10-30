import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  Студент: 'Инструктор',
  инструктор: 'Куратор',
  куратор: 'Супервизор',
  супервизор: 'Опытный супервизор',
  'опытный супервизор': null,
};

export function ProgressSummary() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const activeGroup = user?.activeGroup?.name?.toLowerCase();
  const target = activeGroup ? GROUP_PROGRESS_PATH[activeGroup] : null;

  const isSupervisor = activeGroup === 'супервизор';
  const isSeniorSupervisor = activeGroup === 'опытный супервизор';
  const isAboveCeu = isSupervisor || isSeniorSupervisor;

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
        {user?.activeGroup?.name && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Текущий уровень: <strong>{user.activeGroup.name}</strong>
            </p>
          </div>
        )}

        {isSupervisor && (
          <div
            className="rounded-xl p-3 border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <p className="text-red-600">
              Напоминание: не забывайте проходить <strong>менторство</strong>.
            </p>
          </div>
        )}

        {target && !isAboveCeu && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Цель перехода: <strong>{target}</strong>
            </p>
          </div>
        )}

        {!isAboveCeu && <CeuSummaryBlock />}
        <SupervisionSummaryBlock user={user} />
      </div>
    </div>
  );
}
