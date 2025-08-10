import { docReviewStatusLabels, yesNoLabels } from '@/utils/labels';

const backendUrl = import.meta.env.VITE_API_URL;

type Props = {
  requests: {
    id: string;
    status: string;
    paid: boolean;
    reviewerEmail: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    comment: string | null;
    documents: { fileId: string; name: string }[];
  }[];
};

export default function DocReviewBlock({ requests }: Props) {
  if (!requests?.length) return null;

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">Заявки на проверку документов</h2>

      {requests.map((r) => (
        <div key={r.id} className="border p-4 rounded-xl bg-gray-50 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <strong>ID:</strong> {r.id}
            </div>
            <div>
              <strong>Статус:</strong> {docReviewStatusLabels[r.status] || r.status}
            </div>
            <div>
              <strong>Оплачено:</strong>{' '}
              {yesNoLabels[String(r.paid) as 'true' | 'false'] ?? (r.paid ? 'Да' : 'Нет')}
            </div>
            <div>
              <strong>Отправлено:</strong> {fmt(r.submittedAt)}
            </div>
            <div>
              <strong>Проверено:</strong> {fmt(r.reviewedAt)}
            </div>
            <div>
              <strong>Ревьюер:</strong> {r.reviewerEmail ?? '—'}
            </div>
          </div>

          <div className="text-sm">
            <strong>Комментарий:</strong> {r.comment || '—'}
          </div>

          <div className="text-sm">
            <strong>Файлы:</strong>{' '}
            {r.documents?.length
              ? r.documents.map((d, i) => (
                  <a
                    key={d.fileId}
                    href={`${backendUrl}/uploads/${d.fileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline mr-2"
                  >
                    {d.name}
                    {i < r.documents.length - 1 ? ',' : ''}
                  </a>
                ))
              : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
