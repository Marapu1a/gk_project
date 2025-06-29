import { useGetDocumentReviewRequest } from '@/features/documentReview/hooks/useGetDocumentReviewRequest';
import { DocumentReviewForm } from '@/features/documentReview/components/DocumentReviewForm';
import { documentReviewStatusLabels } from '@/utils/documentReviewStatusLabels';
import { BackButton } from '@/components/BackButton';

export default function DocumentReviewRequestPage() {
  const { data: request, isLoading } = useGetDocumentReviewRequest();

  if (isLoading) return <p>Загрузка...</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      {request && request.id ? (
        <div className="bg-gray-100 p-4 rounded space-y-2">
          <p>Заявка уже подана.</p>
          <p>Статус: {documentReviewStatusLabels[request.status] || request.status}</p>
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
