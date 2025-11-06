import { format } from 'date-fns';
import { useSupervisionHistory } from '../hooks/useSupervisionHistory';
import type { SupervisionHistoryItem } from '../api/getSupervisionHistory';
import { recordStatusLabels } from '@/utils/labels';

// Поддерживаем новые и legacy типы
function typeLabel(t: string): string {
  if (t === 'PRACTICE' || t === 'INSTRUCTOR') return 'Практика';
  if (t === 'SUPERVISION' || t === 'CURATOR') return 'Супервизия';
  if (t === 'SUPERVISOR') return 'Менторство';
  return t;
}

export function SupervisionHistoryTable() {
  const {
    data,
    status, // 'pending' | 'error' | 'success'
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useSupervisionHistory({ take: 25 });

  if (status === 'pending') {
    return (
      <div className="rounded-2xl border header-shadow bg-white p-6 text-sm">
        Загрузка истории часов…
      </div>
    );
  }

  if (status === 'error') {
    console.error('supervision history error:', error);
    return (
      <div className="rounded-2xl border header-shadow bg-white p-6 text-error">
        Ошибка загрузки истории
      </div>
    );
  }

  const items: SupervisionHistoryItem[] = data ? data.pages.flatMap((p) => p.items) : [];

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">История супервизии</h2>
      </div>

      <div className="p-6 overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">Пока пусто.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                <th className="p-2 text-center">Дата</th>
                <th className="p-2 text-center">Тип</th>
                <th className="p-2 text-center">Часы</th>
                <th className="p-2 text-center">Статус</th>
                <th className="p-2 text-center">Проверено</th>
                <th className="p-2 text-center">Причина отклонения</th>
              </tr>
            </thead>
            <tbody>
              {items.map((hour) => (
                <tr
                  key={hour.id}
                  className="border-t hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="p-2 text-center">
                    {format(new Date(hour.createdAt), 'dd.MM.yyyy')}
                  </td>
                  <td className="p-2 text-center">{typeLabel(hour.type)}</td>
                  <td className="p-2 text-center">{hour.value}</td>
                  <td className="p-2 text-center">
                    <span
                      className={
                        hour.status === 'CONFIRMED'
                          ? 'text-green-700'
                          : hour.status === 'REJECTED'
                            ? 'text-red-600'
                            : hour.status === 'SPENT'
                              ? 'text-gray-500 italic'
                              : 'text-yellow-700'
                      }
                    >
                      {recordStatusLabels[hour.status] ?? hour.status}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {hour.reviewedAt ? format(new Date(hour.reviewedAt), 'dd.MM.yyyy') : '—'}
                  </td>
                  <td className="p-2 text-center text-red-600">
                    {hour.status === 'REJECTED' ? hour.rejectedReason || '—' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {hasNextPage && (
          <div
            className="mt-3 pt-3 border-t flex justify-center"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <button className="btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Загружаем…' : 'Загрузить ещё'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
