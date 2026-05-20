import { SupervisionReviewForm } from '@/features/supervision/components/SupervisionReviewForm';
import { useAssignedHours } from '@/features/supervision/hooks/useAssignedHours';
import { PageNav } from '@/components/PageNav';

export default function SupervisionReviewPage() {
  const { data, isLoading, error } = useAssignedHours();

  if (isLoading) return <p>Загрузка заявок...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки заявок</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-dark">Проверка часов супервизии</h1>

      {/* Верхняя панель кнопок */}
      <PageNav />

      <SupervisionReviewForm />

      {/* Нижняя панель кнопок */}
      <PageNav className="border-t border-gray-200 pt-4" />
    </div>
  );
}
