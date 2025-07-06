import { useParams } from 'react-router-dom';
import { useGetDocReviewRequestById } from '../hooks/useGetDocReviewRequestById';
import { useUpdateDocReviewRequestStatus } from '../hooks/useUpdateDocReviewRequestStatus';
import { useUpdateDocReviewRequestPaid } from '../hooks/useUpdateDocReviewRequestPaid';
import { useState } from 'react';
import {
  documentReviewStatusLabels,
  documentReviewStatusColors,
} from '@/utils/documentReviewStatusLabels';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { documentTypeLabels } from '@/utils/documentTypeLabels';

const backendUrl = import.meta.env.VITE_API_URL;

export function AdminDocumentReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, error } = useGetDocReviewRequestById(id);
  const updateStatus = useUpdateDocReviewRequestStatus();
  const updatePaid = useUpdateDocReviewRequestPaid();

  const [newStatus, setNewStatus] = useState<'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED'>(
    'UNCONFIRMED',
  );
  const [rejectComment, setRejectComment] = useState('');

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-error">Ошибка загрузки</p>;
  if (!request) return <p className="text-error">Заявка не найдена</p>;

  const handleStatusUpdate = () => {
    updateStatus.mutate({
      id: request.id,
      status: newStatus,
      comment: newStatus === 'REJECTED' ? rejectComment : undefined,
    });
    alert('Статус изменён.');
  };

  const handlePaidUpdate = () => {
    updatePaid.mutate({
      id: request.id,
      paid: !request.paid,
    });
  };

  return (
    <div className="space-y-8 p-6 bg-white border border-blue-dark/10 rounded-xl shadow-sm max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-dark">Заявка {request.id.slice(0, 6)}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <p>
          <strong>Email:</strong> {request.user?.email}
        </p>
        <p>
          <strong>Статус:</strong>{' '}
          <span className={documentReviewStatusColors[request.status] || ''}>
            {documentReviewStatusLabels[request.status] || request.status}
          </span>
        </p>
        <p>
          <strong>Оплачено:</strong> {request.paid ? 'Да' : 'Нет'}
        </p>
        <p>
          <strong>Комментарий:</strong> {request.comment || '—'}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-blue-dark">Файлы</h2>
        {request.documents.length === 0 ? (
          <p className="text-sm text-gray-600">Нет файлов</p>
        ) : (
          <ul className="space-y-3">
            {request.documents.map((doc: any) => (
              <li
                key={doc.id}
                className="flex items-center gap-4 p-3 border border-green-light rounded bg-green-light/10"
              >
                {doc.mimeType.startsWith('image/') ? (
                  <img
                    src={`${backendUrl}/uploads/${doc.fileId}`}
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
                      href={`${backendUrl}/uploads/${doc.fileId}`}
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

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-blue-dark">Изменить статус</h2>

        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED')}
          className="input w-full"
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
              className="input w-full"
              placeholder="Введите причину отклонения"
            />
          </div>
        )}

        <Button
          onClick={handleStatusUpdate}
          loading={updateStatus.isPending}
          className="w-full md:w-auto mr-1"
        >
          Сохранить статус
        </Button>

        <Button
          onClick={handlePaidUpdate}
          loading={updatePaid.isPending}
          className="w-full md:w-auto"
        >
          {request.paid ? 'Отметить как неоплачено' : 'Отметить как оплачено'}
        </Button>
      </div>

      <BackButton />
    </div>
  );
}
