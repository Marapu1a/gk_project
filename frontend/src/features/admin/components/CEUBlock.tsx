import { useState } from 'react';
import { ceuCategoryLabels, recordStatusLabels } from '@/utils/labels';
import { useAdminUpdateCeuEntryValue } from '@/features/ceu/hooks/useAdminUpdateCeuEntryValue';
import { toast } from 'sonner';

type Props = {
  userId: string; // обязателен
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
  if (!ceuRecords || ceuRecords.length === 0) return null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [patched, setPatched] = useState<Record<string, number>>({});
  const mutation = useAdminUpdateCeuEntryValue(userId);

  const startEdit = (entryId: string, value: number) => {
    setEditingId(entryId);
    setEditingValue(String(patched[entryId] ?? value));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const confirm = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Сохранить', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const saveEdit = async () => {
    if (!editingId) return;
    const next = parseFloat(editingValue.replace(',', '.'));

    if (Number.isNaN(next) || next <= 0) {
      toast.error('Введите положительное число.');
      return;
    }

    const ok = await confirm(`Сохранить новое значение: ${next}?`);
    if (!ok) return;

    try {
      await mutation.mutateAsync({ entryId: editingId, value: next });
      setPatched((m) => ({ ...m, [editingId]: next }));
      toast.success('Баллы обновлены');
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обновить баллы');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-blue-dark">CEU-заявки</h2>

      {ceuRecords.map((rec) => (
        <div
          key={rec.id}
          className="rounded-2xl border p-4 bg-white space-y-3 header-shadow"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">
                {rec.eventName} — {formatDate(rec.eventDate)}
              </div>
              {rec.fileId && (
                <div className="text-sm">
                  <a
                    href={`/uploads/${rec.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    Открыть файл подтверждения
                  </a>
                </div>
              )}
            </div>
          </div>

          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                  <th className="py-2 px-3 text-left">Категория</th>
                  <th className="py-2 px-3 text-left">Баллы</th>
                  <th className="py-2 px-3 text-left">Статус</th>
                  <th className="py-2 px-3 text-left">Проверено</th>
                  <th className="py-2 px-3 text-left">Комментарий</th>
                  <th className="py-2 px-3 text-left w-44">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rec.entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const shownValue = patched[entry.id] ?? entry.value;

                  return (
                    <tr
                      key={entry.id}
                      className="border-t"
                      style={{ borderColor: 'var(--color-green-light)' }}
                    >
                      <td className="py-2 px-3">
                        {ceuCategoryLabels[entry.category] || entry.category}
                      </td>

                      <td className="py-2 px-3">
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

                      <td className="py-2 px-3">
                        {recordStatusLabels[entry.status] || entry.status}
                      </td>

                      <td className="py-2 px-3">
                        {entry.reviewedAt ? (
                          <>
                            {new Date(entry.reviewedAt).toLocaleDateString('ru-RU')}{' '}
                            <span className="text-gray-500">
                              {entry.reviewer?.fullName || entry.reviewer?.email || ''}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2 px-3">{entry.rejectedReason || '—'}</td>

                      <td className="py-2 px-3">
                        {!isEditing ? (
                          <button
                            className="btn btn-accent disabled:opacity-50"
                            onClick={() => startEdit(entry.id, shownValue)}
                            disabled={mutation.isPending}
                          >
                            Редактировать
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-brand disabled:opacity-50"
                              onClick={saveEdit}
                              disabled={mutation.isPending}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn disabled:opacity-50"
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
        </div>
      ))}
    </div>
  );
}
