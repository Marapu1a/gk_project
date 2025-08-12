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

  const statusClass = (s: string) =>
    s === 'CONFIRMED'
      ? 'bg-green-100 text-green-700'
      : s === 'REJECTED'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-700';

  const paidClass = (p: boolean) =>
    p ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-blue-dark">Заявки на проверку документов</h2>

      {requests.map((r) => (
        <div
          key={r.id}
          className="bg-white border border-blue-dark/10 p-4 rounded-xl shadow-sm space-y-3"
        >
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="font-mono text-xs">ID: {r.id}</div>

            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(r.status)}`}
            >
              {docReviewStatusLabels[r.status] || r.status}
            </span>

            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paidClass(r.paid)}`}>
              Оплачено: {yesNoLabels[String(r.paid) as 'true' | 'false'] ?? (r.paid ? 'Да' : 'Нет')}
            </span>

            <div className="text-gray-600">Отправлено: {fmt(r.submittedAt)}</div>
            <div className="text-gray-600">Проверено: {fmt(r.reviewedAt)}</div>
            <div className="text-gray-600">Ревьюер: {r.reviewerEmail ?? '—'}</div>
          </div>

          <div className="text-sm">
            <strong>Комментарий:</strong> {r.comment || '—'}
          </div>

          <div className="text-sm">
            <strong>Файлы:</strong>{' '}
            {r.documents?.length ? (
              <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
                {r.documents.map((d) => (
                  <a
                    key={d.fileId}
                    href={`${backendUrl}/uploads/${d.fileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                  >
                    {d.name}
                  </a>
                ))}
              </span>
            ) : (
              '—'
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
