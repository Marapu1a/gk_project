import { DocumentReviewForm } from '@/features/documentReview/components/DocumentReviewForm';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { BackButton } from '@/components/BackButton';

export default function DocumentReviewPage() {
  const { data: request, isLoading } = useGetDocReviewReq();

  if (isLoading) return <p>Загрузка...</p>;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark">Заявка на проверку документов</h1>

      {request ? (
        <div className="space-y-2 border p-4 rounded bg-gray-50">
          <p>Заявка уже подана.</p>
          <p>Статус: {request.status}</p>
          <p>Оплачено: {request.paid ? 'Да' : 'Нет'}</p>
          {request.comment && <p>Комментарий: {request.comment}</p>}
        </div>
      ) : (
        <DocumentReviewForm />
      )}

      <BackButton />
    </div>
  );
}
