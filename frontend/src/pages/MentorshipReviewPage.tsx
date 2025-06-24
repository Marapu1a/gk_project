// src/pages/review/MentorshipReviewPage.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { MentorshipReviewForm } from '@/features/supervision/components/MentorshipReviewForm';

export default function MentorshipReviewPage() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p>Загрузка...</p>;
  if (isError || !user) return <p className="text-error">Ошибка загрузки данных</p>;

  const isExperiencedReviewer =
    user.groups.some((g: { name: string }) => g.name === 'Опытный Супервизор') ||
    user.role === 'ADMIN';

  if (!isExperiencedReviewer) {
    return <p className="text-error">У вас нет доступа к проверке менторства.</p>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark mb-4">Проверка менторства</h1>
      <MentorshipReviewForm />
    </div>
  );
}
