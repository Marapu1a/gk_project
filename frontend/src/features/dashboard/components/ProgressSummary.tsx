import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  студент: 'Инструктор',
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

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-xl font-semibold text-blue-dark">Прогресс CEU и супервизии</h2>

      {activeGroup === 'опытный супервизор' ? (
        <p className="italic">
          Вы копите баллы для <strong>продления супервизорского сертификата</strong>
        </p>
      ) : (
        target && (
          <p className="italic">
            Вы копите баллы и часы для перехода в категорию: <strong>{target}</strong>
          </p>
        )
      )}

      <CeuSummaryBlock />
      <SupervisionSummaryBlock user={user} />
    </div>
  );
}
