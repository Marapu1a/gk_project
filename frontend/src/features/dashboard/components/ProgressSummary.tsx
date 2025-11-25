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

  const isAdmin = user?.role === 'ADMIN';

  // если есть выбранная цель — показываем её; иначе — «лесенка»
  const explicitTargetRu = user?.targetLevel ? RU_BY_LEVEL[user.targetLevel] : null;
  const ladderTarget = activeGroupLc ? GROUP_PROGRESS_PATH[activeGroupLc] : null;
  const targetToShow = explicitTargetRu ?? ladderTarget;

  const isSupervisor = activeGroupLc === 'супервизор';
  const isSeniorSupervisor = activeGroupLc === 'опытный супервизор';
  const isSupervisorLike = isSupervisor || isSeniorSupervisor;

  // enum-уровень для расчётов ЧАСОВ (экзаменационный трек / цель)
  const levelForRequirements = user?.targetLevel ?? undefined;

  // для CEU:
  // - у Соискателя/Инструктора/Куратора — считаем по целевой ступени (levelForRequirements)
  // - у Супервизора/Опытного — бэк сам подставляет годовые требования по активной группе,
  //   level там не нужен
  const ceuLevelForRequirements = isSupervisorLike ? undefined : levelForRequirements;

  // ===== Режим для админов: только заглушка =====
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
          <p className="mt-1 text-gray-600">
            Позже на этом месте будет администраторский блок с агрегированной статистикой и сводками
            по пользователям.
          </p>
        </div>
      </div>
    );
  }

  // ===== Обычный режим (не админ) =====
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

        {/* Цель по "лесенке" имеет смысл показывать только пока есть следующая ступень.
           Для опытных супервизоров и выше "цели" в классическом смысле нет. */}
        {targetToShow && !isSupervisorLike && (
          <div className="rounded-xl p-3" style={{ background: 'var(--color-blue-soft)' }}>
            <p>
              Цель: <strong>{targetToShow}</strong>
              {explicitTargetRu
                ? ' (выбрана пользователем)'
                : ' (определена автоматически по текущему уровню)'}
            </p>
          </div>
        )}

        {/* CEU:
            - для Соискателя / Инструктора / Куратора — требования к следующей группе;
            - для Супервизора / Опытного Супервизора — годовые требования
              (24 балла непрерывного образования), бэк смотрит на активную группу. */}
        <CeuSummaryBlock level={ceuLevelForRequirements} />

        {/* Часы супервизии / менторства считаются по целевому уровню / треку */}
        {user && <SupervisionSummaryBlock user={user} level={levelForRequirements} />}
      </div>
    </div>
  );
}
