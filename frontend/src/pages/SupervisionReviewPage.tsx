import { SupervisionReviewForm } from '@/features/supervision/components/SupervisionReviewForm';
import { useAssignedHours } from '@/features/supervision/hooks/useAssignedHours';
import { BackButton } from '@/components/BackButton';
import { DashboardButton } from '@/components/DashboardButton';

export default function SupervisionReviewPage() {
  const { data, isLoading, error } = useAssignedHours();

  if (isLoading) return <p>Загрузка заявок...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки заявок</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Проверка часов супервизии</h1>

      {/* Верхняя панель кнопок */}
      <div className="flex gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <SupervisionReviewForm />

      {/* Нижняя панель кнопок */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <BackButton />
        <DashboardButton />
      </div>
    </div>
  );
}
