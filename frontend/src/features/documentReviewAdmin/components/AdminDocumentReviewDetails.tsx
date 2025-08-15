import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDocReviewRequestById } from '../hooks/useGetDocReviewRequestById';
import { useUpdateDocReviewRequestStatus } from '../hooks/useUpdateDocReviewRequestStatus';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  documentReviewStatusLabels,
  documentReviewStatusColors,
} from '@/utils/documentReviewStatusLabels';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { documentTypeLabels } from '@/utils/documentTypeLabels';
import { postNotification } from '@/features/notifications/api/notifications';
import { PaymentStatusToggle } from '@/features/payment/components/PaymentStatusToggle';
import { useUserPaymentsById } from '@/features/payment/hooks/useUserPaymentsById';

const paymentStatusText: Record<string, string> = {
  UNPAID: 'Не оплачено',
  PENDING: 'Ожидает проверки',
  PAID: 'Оплачено',
};

export function AdminDocumentReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, error } = useGetDocReviewRequestById(id);
  const updateStatus = useUpdateDocReviewRequestStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState<'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED'>(
    'UNCONFIRMED',
  );
  const [rejectComment, setRejectComment] = useState('');

  const { data: payments } = useUserPaymentsById(request?.user?.id);
  const documentPayment = payments?.find((p) => p.type === 'DOCUMENT_REVIEW');

  if (isLoading) return <p className="p-6">Загрузка...</p>;
  if (error) return <p className="p-6 text-error">Ошибка загрузки</p>;
  if (!request) return <p className="p-6 text-error">Заявка не найдена</p>;

  const handleStatusUpdate = async () => {
    if (newStatus === 'REJECTED' && rejectComment.trim() === '') {
      toast.error('Укажите причину отклонения.');
      return;
    }

    if (newStatus === 'CONFIRMED' && documentPayment?.status !== 'PAID') {
      toast.error('Нельзя подтвердить заявку без оплаты.');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: request.id,
        status: newStatus,
        comment: newStatus === 'REJECTED' ? rejectComment : undefined,
      });

      await postNotification({
        userId: request.user.id,
        type: 'DOCUMENT',
        message:
          newStatus === 'REJECTED'
            ? 'Ваша заявка на проверку документов отклонена'
            : 'Ваша заявка на проверку документов подтверждена',
        link: '/document-review',
      });

      await queryClient.invalidateQueries({ queryKey: ['userPayments', request.user.id] });

      toast.success('Статус изменён, оповещение отправлено.');
      navigate('/admin/document-review');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Ошибка при обновлении статуса');
    }
  };

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden max-w-4xl mx-auto"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h1 className="text-xl font-bold text-blue-dark">Заявка {request.id.slice(0, 6)}</h1>
        <BackButton />
      </div>

      {/* Body */}
      <div className="p-6 space-y-8">
        {/* Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p>Email: {request.user?.email}</p>
          <p>
            Статус:{' '}
            <span className={documentReviewStatusColors[request.status] || ''}>
              {documentReviewStatusLabels[request.status] || request.status}
            </span>
          </p>
          <div className="space-y-1">
            <p>
              <span className="font-medium">Оплата:</span>{' '}
              {documentPayment ? (
                paymentStatusText[documentPayment.status] || documentPayment.status
              ) : (
                <span className="text-gray-600">Нет информации</span>
              )}
            </p>
            {documentPayment && <PaymentStatusToggle payment={documentPayment} isAdmin={true} />}
          </div>
          <p>Комментарий: {request.comment || '—'}</p>
        </div>

        {/* Files */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-blue-dark">Файлы</h2>
          {request.documents.length === 0 ? (
            <p className="text-sm text-gray-600">Нет файлов</p>
          ) : (
            <ul className="space-y-3">
              {request.documents.map((doc: any) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 p-3 border rounded bg-green-light/10"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  {doc.mimeType.startsWith('image/') ? (
                    <img
                      src={`/uploads/${doc.fileId}`}
                      alt={doc.name}
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ) : doc.mimeType === 'application/pdf' ? (
                    <div className="w-20 h-20 flex items-center justify-center border rounded bg-red-100 text-red-600 font-bold">
                      PDF
                    </div>
                  ) : (
                    <span className="text-xs">{doc.name}</span>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      <a
                        href={`/uploads/${doc.fileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand underline"
                      >
                        {doc.name}
                      </a>
                    </p>
                    <p className="text-xs text-gray-600">
                      Тип: {documentTypeLabels[doc.type || 'OTHER'] || doc.type}
                    </p>
                    {doc.comment && (
                      <p className="text-xs text-gray-600">Комментарий: {doc.comment}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status change */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-blue-dark">Изменить статус</h2>
          <select
            value={newStatus}
            onChange={(e) =>
              setNewStatus(e.target.value as 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED')
            }
            className="input w-full md:w-1/2"
          >
            {Object.entries(documentReviewStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {newStatus === 'REJECTED' && (
            <div>
              <label className="block mb-1 text-sm font-medium">Комментарий при отклонении</label>
              <input
                type="text"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="input w-full md:w-1/2"
                placeholder="Введите причину отклонения"
              />
            </div>
          )}

          <Button
            onClick={handleStatusUpdate}
            loading={updateStatus.isPending}
            className="w-full md:w-auto"
          >
            Сохранить статус
          </Button>
        </div>
      </div>
    </div>
  );
}
