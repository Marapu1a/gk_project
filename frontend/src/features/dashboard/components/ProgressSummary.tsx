import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { CeuSummaryBlock } from '@/features/ceu/components/CeuSummaryBlock';
import { SupervisionSummaryBlock } from '@/features/supervision/components/SupervisionSummaryBlock';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  Студент: 'Инструктор',
  Инструктор: 'Куратор',
  Куратор: 'Супервизор',
  Супервизор: 'Опытный супервизор',
  'Опытный супервизор': null,
};

export function ProgressSummary() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const target = user?.activeGroup?.name ? GROUP_PROGRESS_PATH[user.activeGroup.name] : null;

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-xl font-semibold text-blue-dark">Прогресс CEU и супервизии</h2>

      {target && (
        <p className="italic">
          Вы копите баллы и часы для перехода в категорию: <strong>{target}</strong>
        </p>
      )}

      <CeuSummaryBlock />
      <SupervisionSummaryBlock />
    </div>
  );
}
