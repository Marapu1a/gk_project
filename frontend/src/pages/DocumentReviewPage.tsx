import { DocumentReviewForm } from '@/features/documentReview/components/DocumentReviewForm';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { BackButton } from '@/components/BackButton';

type RequestStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED';

const statusMessages: Record<RequestStatus, string> = {
  UNCONFIRMED: 'Заявка отправлена и находится на проверке.',
  CONFIRMED: 'Заявка одобрена. Благодарим за предоставленные документы.',
  REJECTED: 'Заявка отклонена. Ознакомьтесь с комментарием и подайте новую.',
};

const paymentStatusLabels: Record<'UNPAID' | 'PENDING' | 'PAID', string> = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает подтверждения',
  PAID: 'Оплачено',
};

export default function DocumentReviewPage() {
  const { data: request, isLoading } = useGetDocReviewReq();
  const { data: payments } = useUserPayments();

  if (isLoading) {
    return <p className="text-sm text-blue-dark p-6">Загрузка…</p>;
  }

  const canResubmit = !request || request.status === 'REJECTED';
  const documentPayment = payments?.find((p) => p.type === 'DOCUMENT_REVIEW');

  const StatusPill = ({ s }: { s: RequestStatus }) => {
    const bg =
      s === 'CONFIRMED'
        ? 'var(--color-green-brand)'
        : s === 'UNCONFIRMED'
          ? 'var(--color-blue-dark)'
          : '#ef4444';
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ background: bg }}
      >
        {statusMessages[s]}
      </span>
    );
  };

  const PaymentPill = () => {
    const st = documentPayment?.status ?? 'UNPAID';
    const label = paymentStatusLabels[st as keyof typeof paymentStatusLabels];
    const bg =
      st === 'PAID'
        ? 'var(--color-green-brand)'
        : st === 'PENDING'
          ? 'var(--color-blue-dark)'
          : '#ef4444';
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ background: bg }}
      >
        Оплата: {label}
      </span>
    );
  };

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden max-w-3xl mx-auto"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h1 className="text-2xl font-bold text-blue-dark">Заявка на проверку документов</h1>
        <BackButton />
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {canResubmit ? (
          <DocumentReviewForm
            lastAdminComment={
              request?.status === 'REJECTED' && request?.comment?.trim()
                ? request.comment
                : undefined
            }
          />
        ) : (
          <div
            className="rounded-2xl border p-4 space-y-3"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill s={request.status as RequestStatus} />
              <PaymentPill />
            </div>

            {request.comment && request.status === 'REJECTED' && (
              <p className="text-sm text-red-700">
                Комментарий модератора: <span className="font-medium">{request.comment}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
