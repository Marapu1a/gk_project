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
  /** true, если пользователь Супервизор или Опытный Супервизор */
  isSupervisor: boolean;
};

export default function AdminCEUMatrixBlock({ userId, isSupervisor }: Props) {
  const { data, isLoading, error } = useUserCEUMatrix(userId);
  const mutation = useUpdateUserCEUMatrix(userId);

  const [editing, setEditing] = useState<{ category: CEUCategory; status: CEUStatus } | null>(null);
  const [value, setValue] = useState<string>('');

  if (isLoading) return <p className="text-blue-dark">Загрузка CEU-баллов…</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки CEU-баллов</p>;

  const startEdit = (category: CEUCategory, status: CEUStatus, current: number) => {
    if (isSupervisor) return; // защита от клика
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
      <h2 className="text-xl font-semibold text-blue-dark">
        CEU-баллы {isSupervisor ? '(редактирование запрещено)' : '(редактирование разрешено)'}
      </h2>

      {isSupervisor && (
        <div className="card p-4 " style={{ border: '1px solid var(--color-green-light)' }}>
          <p className="text-sm">
            Супервизоры баллы не набирают. Ниже показаны ранее набранные баллы — редактирование
            отключено.
          </p>
        </div>
      )}

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
            {Object.entries(categoryLabels).map(([cat, catLabel]) => (
              <tr
                key={cat}
                className="border-t"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
                <td className="py-2 px-3 font-medium">{catLabel}</td>
                {Object.keys(statusLabels).map((st) => {
                  const isEditing = editing?.category === cat && editing?.status === st;
                  const current = data.matrix[cat as CEUCategory][st as CEUStatus];

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
                      ) : isSupervisor ? (
                        <span>{current}</span>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          onClick={() => startEdit(cat as CEUCategory, st as CEUStatus, current)}
                          disabled={mutation.isPending}
                        >
                          {current}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
