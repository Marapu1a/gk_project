import { useState } from 'react';
import { Button } from '@/components/Button';
import { useUpdateDocumentReviewRequestStatus } from '../hooks/useUpdateDocumentReviewRequestStatus';
import { useMarkDocumentReviewRequestPaid } from '../hooks/useMarkDocumentReviewRequestPaid';
import { useUpdateDocumentReviewRequestComment } from '../hooks/useUpdateDocumentReviewRequestComment';

type Props = {
  request: any;
  onClose: () => void;
};

const API_URL = import.meta.env.VITE_API_URL;

export function DocumentReviewModal({ request, onClose }: Props) {
  const [comment, setComment] = useState(request.comment ?? '');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [paidStatus, setPaidStatus] = useState(request.paid);

  const updateStatus = useUpdateDocumentReviewRequestStatus();
  const markPaid = useMarkDocumentReviewRequestPaid();
  const updateComment = useUpdateDocumentReviewRequestComment();

  const handleApprove = () => {
    updateComment.mutate(
      { id: request.id, comment },
      {
        onSuccess: () => {
          updateStatus.mutate(
            { id: request.id, status: 'CONFIRMED' },
            { onSuccess: onClose, onError: () => alert('Ошибка при подтверждении заявки') },
          );
        },
        onError: () => alert('Ошибка при сохранении комментария'),
      },
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Введите причину отказа');
      return;
    }
    updateStatus.mutate(
      { id: request.id, status: 'REJECTED', comment: rejectReason },
      {
        onSuccess: onClose,
        onError: () => alert('Ошибка при отклонении заявки'),
      },
    );
  };

  const handleTogglePaid = () => {
    const confirmMsg = paidStatus
      ? 'Вы уверены, что хотите снять отметку об оплате?'
      : 'Отметить как оплачено?';
    if (!confirm(confirmMsg)) return;

    markPaid.mutate(
      { id: request.id, paid: !paidStatus },
      {
        onSuccess: () => {
          setPaidStatus((prev: boolean) => !prev);
        },
        onError: () => alert('Ошибка при изменении статуса оплаты'),
      },
    );
  };

  const isLoading = updateStatus.isPending || updateComment.isPending || markPaid.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-blue-dark">Заявка от {request.user.fullName}</h2>
        <p className="text-sm text-gray-500">{request.user.email}</p>

        <div className="space-y-2">
          {request.documentDetails.map((doc: any) => (
            <div key={doc.fileId} className="border border-green-light rounded p-3">
              <p className="font-medium">{doc.type}</p>
              {doc.comment && <p className="text-xs text-gray-500">{doc.comment}</p>}
              <a
                href={`${API_URL}/${doc.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-dark underline"
              >
                Открыть файл
              </a>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Комментарий администратора</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleApprove} disabled={isLoading}>
            Подтвердить
          </Button>
          <Button
            onClick={() => setShowRejectReason(!showRejectReason)}
            className="bg-red-500 hover:bg-red-600"
            disabled={isLoading}
          >
            Отклонить
          </Button>
          <Button
            onClick={handleTogglePaid}
            className="bg-green-brand hover:bg-green-dark"
            disabled={isLoading}
          >
            {paidStatus ? 'Снять оплату' : 'Отметить как оплачено'}
          </Button>
          <Button onClick={onClose} className="bg-gray-400 hover:bg-gray-500">
            Закрыть
          </Button>
        </div>

        {showRejectReason && (
          <div>
            <label className="block text-sm font-medium mb-1">Причина отказа</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input"
            />
            <Button
              onClick={handleReject}
              disabled={isLoading}
              className="mt-2 bg-red-500 hover:bg-red-600"
            >
              Подтвердить отклонение
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
