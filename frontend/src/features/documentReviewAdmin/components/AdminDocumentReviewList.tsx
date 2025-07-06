import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllDocReviewRequests } from '../hooks/useAllDocReviewRequests';
import {
  documentReviewStatusLabels,
  documentReviewStatusColors,
} from '@/utils/documentReviewStatusLabels';

export function AdminDocumentReviewList() {
  const [searchEmail, setSearchEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { data: requests = [], isLoading, error } = useAllDocReviewRequests(submittedEmail);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedEmail(searchEmail.trim());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-dark">Все заявки на проверку документов</h1>

      <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
        <div>
          <label className="block mb-1">Поиск по email</label>
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Введите email"
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-brand">
          Поиск
        </button>
      </form>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p className="text-error">Ошибка загрузки</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-blue-soft text-blue-dark">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Статус</th>
              <th className="p-2 text-left">Комментарий</th>
              <th className="p-2 text-left">Оплачено</th>
              <th className="p-2 text-left">Дата</th>
              <th className="p-2 text-left">Действие</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req: any) => (
              <tr key={req.id} className="border-t">
                <td className="p-2">{req.id.slice(0, 6)}</td>
                <td className="p-2">{req.user?.email}</td>
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
                <td className="p-2">{req.paid ? 'Да' : 'Нет'}</td>
                <td className="p-2">{new Date(req.submittedAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <Link
                    to={`/admin/document-review/${req.id}`}
                    className="text-blue-dark underline"
                  >
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
