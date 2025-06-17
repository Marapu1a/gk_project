import { SupervisionReviewForm } from '@/features/supervision/components/SupervisionReviewForm';
import { useAssignedHours } from '@/features/supervision/hooks/useAssignedHours';
import { BackButton } from '@/components/BackButton';

export default function SupervisionReviewPage() {
  const { data, isLoading, error } = useAssignedHours();

  if (isLoading) return <p>Загрузка заявок...</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки заявок</p>;
  if (data.length === 0)
    return (
      <>
        <p>Нет заявок на проверку</p>
        <BackButton />
      </>
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-dark mb-6">Проверка часов супервизии</h1>
      <SupervisionReviewForm />
      <BackButton />
    </div>
  );
}
