// src/features/progress/components/ProgressSummary.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

// ключи — строго в нижнем регистре
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

  // если есть выбранная цель — показываем её; иначе — «лесенка»
  const explicitTargetRu = user?.targetLevel ? RU_BY_LEVEL[user.targetLevel] : null;
  const ladderTarget = activeGroupLc ? GROUP_PROGRESS_PATH[activeGroupLc] : null;
  const targetToShow = explicitTargetRu ?? ladderTarget;

  // enum-уровень для расчётов CEU/часов
  const levelForRequirements = user?.targetLevel ?? undefined;

  const isSupervisor = activeGroupLc === 'супервизор';
  const isSeniorSupervisor = activeGroupLc === 'опытный супервизор';
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
        {activeGroupName && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Текущий уровень: <strong>{activeGroupName}</strong>
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

        {targetToShow && !isAboveCeu && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Цель: <strong>{targetToShow}</strong>
              {explicitTargetRu ? ' (выбрана пользователем)' : ' (по лесенке)'}
            </p>
          </div>
        )}

        {/* CEU пересчитывается по целевому уровню */}
        {!isAboveCeu && <CeuSummaryBlock level={levelForRequirements} />}

        {/* Часы тоже пересчитываются по целевому уровню */}
        {user && <SupervisionSummaryBlock user={user} level={levelForRequirements} />}
      </div>
    </div>
  );
}
