import { DocumentReviewForm } from '@/features/documentReview/components/DocumentReviewForm';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { BackButton } from '@/components/BackButton';

type RequestStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';

const statusMessages: Record<'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED', string> = {
  UNCONFIRMED: 'Заявка отправлена и находится на проверке.',
  CONFIRMED: 'Заявка одобрена. Благодарим за предоставленные документы.',
  REJECTED: 'Заявка отклонена. Ознакомьтесь с комментарием и подайте новую.',
};

export default function DocumentReviewPage() {
  const { data: request, isLoading } = useGetDocReviewReq();

  if (isLoading) return <p>Загрузка...</p>;

  const canResubmit = !request || request.status === 'REJECTED';

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark">Заявка на проверку документов</h1>

      {canResubmit ? (
        <DocumentReviewForm />
      ) : (
        <div className="space-y-2 border p-4 rounded bg-gray-50">
          <p>{statusMessages[request.status as RequestStatus]}</p>
          <p>Оплачено: {request.paid ? 'Да' : 'Нет'}</p>
          {request.comment && <p>Комментарий модератора: {request.comment}</p>}
        </div>
      )}

      <BackButton />
    </div>
  );
}
