// src/features/admin/components/AdminCEUMatrixBlock.tsx
import { useState } from 'react';
import { useUserCEUMatrix } from '../hooks/ceu/useUserCEUMatrix';
import { useUpdateUserCEUMatrix } from '../hooks/ceu/useUpdateUserCEUMatrix';
import type { CEUCategory, CEUStatus } from '../api/ceu/getUserCEUMatrix';
import { toast } from 'sonner';

const categoryLabels: Record<CEUCategory, string> = {
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
  GENERAL: 'Общие',
};

const statusLabels: Record<CEUStatus, string> = {
  CONFIRMED: 'Подтверждено',
  SPENT: 'Потрачено',
  REJECTED: 'Отклонено',
};

type Props = {
  userId: string;
  isSupervisor: boolean;
};

export default function AdminCEUMatrixBlock({ userId }: Props) {
  const { data, isLoading, error } = useUserCEUMatrix(userId);
  const mutation = useUpdateUserCEUMatrix(userId);

  const [editing, setEditing] = useState<{ category: CEUCategory; status: CEUStatus } | null>(null);
  const [value, setValue] = useState<string>('');

  if (isLoading) return <p className="text-blue-dark">Загрузка CEU-баллов…</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки CEU-баллов</p>;

  const startEdit = (category: CEUCategory, status: CEUStatus, current: number) => {
    if (status !== 'CONFIRMED') return;
    setEditing({ category, status });
    setValue(String(current));
  };

  const cancelEdit = () => {
    setEditing(null);
    setValue('');
  };

  const saveEdit = async () => {
    if (!editing) return;

    const next = parseFloat(value.replace(',', '.'));
    if (Number.isNaN(next) || next < 0) {
      toast.error('Введите корректное число');
      return;
    }

    try {
      await mutation.mutateAsync({
        category: editing.category,
        status: editing.status,
        value: next,
      });
      toast.success('Баллы обновлены');
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка обновления');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-blue-dark">CEU-баллы</h2>

      <div
        className="overflow-x-auto rounded-2xl border header-shadow"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-blue-soft)' }} className="text-blue-dark">
              <th className="py-2 px-3 text-left">Категория</th>
              {Object.entries(statusLabels).map(([key, label]) => (
                <th key={key} className="py-2 px-3 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Object.entries(categoryLabels).map(([cat, catLabel]) => {
              const row = data.matrix[cat as CEUCategory] as
                | Partial<Record<CEUStatus, number>>
                | undefined;

              return (
                <tr
                  key={cat}
                  className="border-t"
                  style={{ borderColor: 'var(--color-green-light)' }}
                >
                  <td className="py-2 px-3 font-medium">{catLabel}</td>

                  {Object.keys(statusLabels).map((st) => {
                    const status = st as CEUStatus;
                    const isEditing = editing?.category === cat && editing?.status === status;
                    const current = row?.[status] ?? 0;
                    const isEditable = status === 'CONFIRMED';

                    return (
                      <td key={st} className="py-2 px-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="input w-24"
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              disabled={mutation.isPending}
                            />
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
                        ) : isEditable ? (
                          <button
                            className="btn btn-ghost"
                            onClick={() =>
                              startEdit(cat as CEUCategory, status as CEUStatus, current)
                            }
                            disabled={mutation.isPending}
                            style={{
                              fontWeight: 600,
                              borderBottom: '1px dashed var(--color-blue-dark)',
                            }}
                          >
                            {current}
                          </button>
                        ) : (
                          <span>{current}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
