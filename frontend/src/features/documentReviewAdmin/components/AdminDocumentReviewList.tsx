import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllDocReviewRequests } from '../hooks/useAllDocReviewRequests';
import {
  documentReviewStatusLabels,
  documentReviewStatusColors,
} from '@/utils/documentReviewStatusLabels';

type RequestRow = {
  id: string;
  status: string;
  comment?: string | null;
  submittedAt: string;
  user?: { email?: string | null } | null;
};

export function AdminDocumentReviewList() {
  const [searchEmail, setSearchEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { data: requests = [], isLoading, error } = useAllDocReviewRequests(submittedEmail);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedEmail(searchEmail.trim());
  };

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h1 className="text-xl font-bold text-blue-dark">Все заявки на проверку документов</h1>

        <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">Поиск по email</label>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Введите email"
              className="input w-64"
            />
          </div>
          <button type="submit" className="btn btn-brand">
            Поиск
          </button>
        </form>
      </div>

      {/* Body */}
      <div className="p-6">
        {isLoading ? (
          <p className="text-sm text-blue-dark">Загрузка…</p>
        ) : error ? (
          <p className="text-error">Ошибка загрузки</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ничего не найдено{submittedEmail ? ` по «${submittedEmail}»` : ''}.
          </p>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Статус</th>
                  <th className="p-2 text-left">Комментарий</th>
                  <th className="p-2 text-left">Дата</th>
                  <th className="p-2 text-left">Действие</th>
                </tr>
              </thead>
              <tbody>
                {(requests as RequestRow[]).map((req) => (
                  <tr
                    key={req.id}
                    className="border-t hover:bg-gray-50"
                    style={{ borderColor: 'var(--color-green-light)' }}
                  >
                    <td className="p-2">{req.id.slice(0, 6)}</td>
                    <td className="p-2">{req.user?.email || '—'}</td>
                    <td className={`p-2 ${documentReviewStatusColors[req.status] || ''}`}>
                      {documentReviewStatusLabels[req.status] || req.status}
                    </td>
                    <td className="p-2">
                      {req.status === 'REJECTED' && req.comment ? (
                        <span className="text-red-600">{req.comment}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-2">
                      {req.submittedAt
                        ? new Date(req.submittedAt).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="p-2">
                      <Link
                        to={`/admin/document-review/${req.id}`}
                        className="text-brand underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
