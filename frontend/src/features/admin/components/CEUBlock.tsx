import { useState } from 'react';
import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';
import { useAdminUpdateCeuEntryValue } from '@/features/ceu/hooks/useAdminUpdateCeuEntryValue';

type Props = {
  userId: string; // 👈 обязателен
  ceuRecords: {
    id: string;
    eventName: string;
    eventDate: string;
    fileId: string | null;
    entries: {
      id: string;
      category: string;
      value: number;
      status: string;
      reviewedAt: string | null;
      rejectedReason: string | null;
      reviewer: { email: string; fullName: string } | null;
    }[];
  }[];
};

export default function CEUBlock({ ceuRecords, userId }: Props) {
  if (ceuRecords.length === 0) return null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [patched, setPatched] = useState<Record<string, number>>({}); // 👈 локальные правки
  const mutation = useAdminUpdateCeuEntryValue(userId);

  const startEdit = (entryId: string, value: number) => {
    setEditingId(entryId);
    setEditingValue(String(patched[entryId] ?? value));
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
    if (!window.confirm(`Сохранить новое значение: ${next}?`)) return;

    await mutation.mutateAsync({ entryId: editingId, value: next });

    // 👇 сразу отражаем в UI
    setPatched((m) => ({ ...m, [editingId]: next }));
    cancelEdit();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-green-brand">CEU-заявки</h2>

      {ceuRecords.map((rec) => (
        <div key={rec.id} className="space-y-2 bg-gray-50">
          <div className="font-medium">
            {rec.eventName} — {formatDate(rec.eventDate)}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1 px-3">Категория</th>
                <th className="py-1 px-3">Баллы</th>
                <th className="py-1 px-3">Статус</th>
                <th className="py-1 px-3">Проверено</th>
                <th className="py-1 px-3">Комментарий</th>
                <th className="py-1 px-3 w-40">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rec.entries.map((entry) => {
                const isEditing = editingId === entry.id;
                const shownValue = patched[entry.id] ?? entry.value; // 👈 показываем патч, если есть
                return (
                  <tr key={entry.id} className="border-t">
                    <td className="py-1 px-3">
                      {ceuCategoryLabels[entry.category] || entry.category}
                    </td>

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
                        shownValue
                      )}
                    </td>

                    <td className="py-1 px-3">
                      {recordStatusLabels[entry.status] || entry.status}
                    </td>

                    <td className="py-1 px-3">
                      {entry.reviewedAt
                        ? `${new Date(entry.reviewedAt).toLocaleDateString()} ${
                            entry.reviewer?.fullName || ''
                          }`
                        : '—'}
                    </td>

                    <td className="py-1 px-3">{entry.rejectedReason || '—'}</td>

                    <td className="py-1 px-3">
                      {!isEditing ? (
                        <button
                          className="btn btn-accent"
                          onClick={() => startEdit(entry.id, shownValue)}
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
