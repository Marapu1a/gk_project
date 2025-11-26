import { useState, useMemo } from 'react';
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

// нормализация для поиска
const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim();
const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g)
    .filter(Boolean);

export function AdminDocumentReviewList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState(''); // уходит на сервер

  const { data: requests = [], isLoading, error } = useAllDocReviewRequests(search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  // ⚡ Мгновенный клиентский фильтр только по email
  const filteredRequests = useMemo(() => {
    const tokens = tokenize(searchInput);
    if (tokens.length === 0) return requests;

    return (requests as RequestRow[]).filter((r) => {
      const email = r.user?.email ?? '';
      const hay = norm(email);
      return tokens.every((t) => hay.includes(t));
    });
  }, [requests, searchInput]);

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
        <h1 className="text-xl font-bold text-blue-dark">
          Все заявки на проверку документов ({filteredRequests.length})
        </h1>

        <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
          <div className="relative">
            <label className="block mb-1 text-sm text-blue-dark">Фильтр по email</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Введите email"
              className="input w-64 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2 bottom-2 text-blue-dark/60 hover:text-blue-dark"
                onClick={() => setSearchInput('')}
                title="Очистить"
              >
                ×
              </button>
            )}
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
        ) : filteredRequests.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ничего не найдено{searchInput ? ` по «${searchInput}»` : ''}.
          </p>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <table className="w-full text-sm table-auto">
              <thead>
                <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                  <th className="p-2 text-left w-16">№</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Статус</th>
                  <th className="p-2 text-left">Комментарий</th>
                  <th className="p-2 text-left">Дата</th>
                  <th className="p-2 text-left">Действие</th>
                </tr>
              </thead>
              <tbody>
                {(filteredRequests as RequestRow[]).map((req, idx) => (
                  <tr
                    key={req.id}
                    className="border-t hover:bg-gray-50"
                    style={{ borderColor: 'var(--color-green-light)' }}
                  >
                    {/* вместо db id — порядковый номер */}
                    <td className="p-2">{idx + 1}</td>

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
