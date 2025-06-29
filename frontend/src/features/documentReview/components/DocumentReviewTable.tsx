import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocumentReviewRequests } from '../hooks/useDocumentReviewRequests';
import { useDocumentReviewRequestsByEmail } from '../hooks/useDocumentReviewRequestsByEmail';
import { Button } from '@/components/Button';
import { DocumentReviewModal } from './DocumentReviewModal';
import { BackButton } from '@/components/BackButton';

export function DocumentReviewTable() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const queryClient = useQueryClient();

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: allRequests, isLoading: loadingAll } = useDocumentReviewRequests();
  const { data: searchRequests, isLoading: loadingSearch } = useDocumentReviewRequestsByEmail(
    debouncedSearch,
    debouncedSearch.length > 0,
  );

  const isLoading = debouncedSearch.length > 0 ? loadingSearch : loadingAll;
  const requests = (debouncedSearch.length > 0 ? searchRequests : allRequests) || [];

  const handleClose = async () => {
    setSelectedRequest(null);
    await queryClient.invalidateQueries({ queryKey: ['documentReviewRequests'] });
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Поиск по email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : requests.length > 0 ? (
        <table className="w-full border border-blue-dark/10 rounded-md overflow-hidden">
          <thead className="bg-blue-soft text-blue-dark text-left text-xs uppercase">
            <tr>
              <th className="p-2">Пользователь</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Оплачено</th>
              <th className="p-2">Комментарий</th>
              <th className="p-2">Дата подачи</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req: any) => (
              <tr key={req.id} className="border-t border-blue-dark/10">
                <td className="p-2">
                  <div className="text-sm font-medium">{req.user.fullName}</div>
                  <div className="text-xs text-gray-500">{req.user.email}</div>
                </td>
                <td className="p-2 text-sm">{req.status}</td>
                <td className="p-2 text-sm">{req.paid ? 'Да' : 'Нет'}</td>
                <td className="p-2 text-sm">{req.comment || '—'}</td>
                <td className="p-2 text-sm">
                  {new Date(req.submittedAt).toLocaleDateString('ru-RU')}
                </td>
                <td className="p-2">
                  <Button onClick={() => setSelectedRequest(req)}>Подробнее</Button>
                </td>
              </tr>
            ))}
          </tbody>
          <BackButton />
        </table>
      ) : (
        <>
          <p>Заявки отсутствуют.</p>

          <BackButton />
        </>
      )}

      {selectedRequest && <DocumentReviewModal request={selectedRequest} onClose={handleClose} />}
    </div>
  );
}
