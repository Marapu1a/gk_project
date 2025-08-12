import { useState } from 'react';
import { practiceLevelLabels, recordStatusLabels } from '@/utils/labels';
import { useAdminUpdateSupervisionHourValue } from '@/features/supervision/hooks/useAdminUpdateSupervisionHourValue';

type Props = {
  supervisionRecords: {
    id: string;
    fileId: string | null;
    createdAt: string;
    hours: {
      id: string;
      type: string;
      value: number;
      status: string;
      reviewedAt: string | null;
      rejectedReason: string | null;
      reviewer: {
        email: string;
        fullName: string;
      } | null;
    }[];
  }[];
  userId?: string; // для точной инвалидации (опционально)
};

export default function SupervisionBlock({ supervisionRecords, userId }: Props) {
  if (supervisionRecords.length === 0) return null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [patched, setPatched] = useState<Record<string, number>>({});
  const mutation = useAdminUpdateSupervisionHourValue(userId);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

  const startEdit = (id: string, value: number) => {
    setEditingId(id);
    setEditingValue(String(patched[id] ?? value));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const next = parseFloat(editingValue.replace(',', '.'));
    if (Number.isNaN(next) || next <= 0) {
      alert('Введите положительное число.');
      return;
    }
    if (!window.confirm(`Сохранить новое значение часов: ${next}?`)) return;

    await mutation.mutateAsync({ id: editingId, value: next });
    setPatched((m) => ({ ...m, [editingId]: next })); // мгновенно отобразить
    cancelEdit();
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">Часы супервизии</h2>

      {supervisionRecords.map((rec) => (
        <div key={rec.id} className="space-y-2 bg-gray-50">
          <div className="font-medium">
            Дата: {formatDate(rec.createdAt)}
            {rec.fileId && (
              <span className="ml-2 text-blue-600 underline cursor-pointer">[файл]</span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 px-3">Тип</th>
                <th className="py-1 px-3">Часы</th>
                <th className="py-1 px-3">Статус</th>
                <th className="py-1 px-3">Проверено</th>
                <th className="py-1 px-3">Комментарий</th>
                <th className="py-1 px-3 w-40">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rec.hours.map((h) => {
                const isEditing = editingId === h.id;
                const shown = patched[h.id] ?? h.value;

                return (
                  <tr key={h.id} className="border-t">
                    <td className="py-1 px-3">{practiceLevelLabels[h.type] || h.type}</td>

                    <td className="py-1 px-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="input w-28"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          disabled={mutation.isPending}
                        />
                      ) : (
                        shown
                      )}
                    </td>

                    <td className="py-1 px-3">{recordStatusLabels[h.status] || h.status}</td>

                    <td className="py-1 px-3">
                      {h.reviewedAt
                        ? `${formatDate(h.reviewedAt)} ${h.reviewer?.fullName || ''}`
                        : '—'}
                    </td>

                    <td className="py-1 px-3">{h.rejectedReason || '—'}</td>

                    <td className="py-1 px-3">
                      {!isEditing ? (
                        <button
                          className="btn btn-accent"
                          onClick={() => startEdit(h.id, shown)}
                          disabled={mutation.isPending}
                        >
                          Редактировать
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-brand"
                            onClick={saveEdit}
                            disabled={mutation.isPending}
                          >
                            Сохранить
                          </button>
                          <button
                            className="btn"
                            onClick={cancelEdit}
                            disabled={mutation.isPending}
                          >
                            Отмена
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
