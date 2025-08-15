import { useState } from 'react';
import { practiceLevelLabels, recordStatusLabels } from '@/utils/labels';
import { useAdminUpdateSupervisionHourValue } from '@/features/supervision/hooks/useAdminUpdateSupervisionHourValue';
import { toast } from 'sonner';

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
      reviewer: { email: string; fullName: string } | null;
    }[];
  }[];
  userId?: string; // опционально — для точной инвалидации
};

export default function SupervisionBlock({ supervisionRecords, userId }: Props) {
  if (!supervisionRecords || supervisionRecords.length === 0) return null;

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
    const ok = await confirm(`Сохранить новое значение часов: ${next}?`);
    if (!ok) return;

    try {
      await mutation.mutateAsync({ id: editingId, value: next });
      setPatched((m) => ({ ...m, [editingId]: next }));
      toast.success('Часы обновлены');
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Не удалось обновить часы');
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-blue-dark">Часы супервизии</h2>

      {supervisionRecords.map((rec) => (
        <div
          key={rec.id}
          className="rounded-2xl border p-4 bg-white space-y-3 header-shadow"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">Дата: {formatDate(rec.createdAt)}</div>
            {rec.fileId && (
              <a
                href={`/uploads/${rec.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline text-sm"
              >
                Открыть файл подтверждения
              </a>
            )}
          </div>

          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                  <th className="py-2 px-3 text-left">Тип</th>
                  <th className="py-2 px-3 text-left">Часы</th>
                  <th className="py-2 px-3 text-left">Статус</th>
                  <th className="py-2 px-3 text-left">Проверено</th>
                  <th className="py-2 px-3 text-left">Комментарий</th>
                  <th className="py-2 px-3 text-left w-44">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rec.hours.map((h) => {
                  const isEditing = editingId === h.id;
                  const shown = patched[h.id] ?? h.value;

                  return (
                    <tr
                      key={h.id}
                      className="border-t"
                      style={{ borderColor: 'var(--color-green-light)' }}
                    >
                      <td className="py-2 px-3">{practiceLevelLabels[h.type] || h.type}</td>

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
                          shown
                        )}
                      </td>

                      <td className="py-2 px-3">{recordStatusLabels[h.status] || h.status}</td>

                      <td className="py-2 px-3">
                        {h.reviewedAt ? (
                          <>
                            {formatDate(h.reviewedAt)}{' '}
                            <span className="text-gray-500">
                              {h.reviewer?.fullName || h.reviewer?.email || ''}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2 px-3">{h.rejectedReason || '—'}</td>

                      <td className="py-2 px-3">
                        {!isEditing ? (
                          <button
                            className="btn btn-accent disabled:opacity-50"
                            onClick={() => startEdit(h.id, shown)}
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
