import { useState } from 'react';
import { useUserSupervisionMatrix } from '../hooks/supervision/useUserSupervisionMatrix';
import { useUpdateUserSupervisionMatrix } from '../hooks/supervision/useUpdateUserSupervisionMatrix';
import type {
  SupervisionLevel,
  SupervisionStatus,
} from '../api/supervision/getUserSupervisionMatrix';
import { toast } from 'sonner';

type Props = {
  userId: string;
  isSupervisor: boolean; // true → это супервизор (или опытный)
};

const LEVEL_LABELS: Record<SupervisionLevel, string> = {
  PRACTICE: 'Практика',
  SUPERVISION: 'Супервизия',
  SUPERVISOR: 'Менторские',
};

const STATUS_LABELS: Record<SupervisionStatus, string> = {
  CONFIRMED: 'Подтверждено',
  UNCONFIRMED: 'На проверке',
};

export default function UserSupervisionMatrix({ userId, isSupervisor }: Props) {
  const { data, isLoading, error } = useUserSupervisionMatrix(userId);
  const mutation = useUpdateUserSupervisionMatrix(userId);

  const [editing, setEditing] = useState<{
    level: SupervisionLevel;
    status: SupervisionStatus;
  } | null>(null);
  const [value, setValue] = useState<string>('');

  if (isLoading) return <p className="text-blue-dark">Загрузка часов…</p>;
  if (error || !data) return <p className="text-error">Ошибка загрузки часов</p>;

  const startEdit = (level: SupervisionLevel, status: SupervisionStatus, current: number) => {
    if (isBlocked(level)) return;
    setEditing({ level, status });
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
      await mutation.mutateAsync({ level: editing.level, status: editing.status, value: next });
      toast.success('Часы обновлены');
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка обновления');
    }
  };

  // блокировки редактирования под новую модель
  const isBlocked = (level: SupervisionLevel) => {
    if (isSupervisor) {
      // супервизору недоступно редактировать PRACTICE/SUPERVISION
      return level === 'PRACTICE' || level === 'SUPERVISION';
    } else {
      // обычному недоступно редактировать менторские
      return level === 'SUPERVISOR';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-blue-dark">Часы супервизии</h2>

      {isSupervisor ? (
        <div className="card p-4" style={{ border: '1px solid var(--color-green-light)' }}>
          <p className="text-sm">
            Супервизоры не набирают часы «Практика» и «Супервизия». Доступно редактирование только
            менторских часов.
          </p>
        </div>
      ) : (
        <div className="card p-4" style={{ border: '1px solid var(--color-green-light)' }}>
          <p className="text-sm">
            Менторские часы доступны только супервизорам. Здесь можно редактировать «Практика» и
            «Супервизия».
          </p>
        </div>
      )}

      <div
        className="overflow-x-auto rounded-2xl border header-shadow"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
              <th className="py-2 px-3 text-left">Категория</th>
              {(Object.keys(STATUS_LABELS) as SupervisionStatus[]).map((st) => (
                <th key={st} className="py-2 px-3 text-left">
                  {STATUS_LABELS[st]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(LEVEL_LABELS) as SupervisionLevel[]).map((lvl) => (
              <tr
                key={lvl}
                className="border-t"
                style={{ borderColor: 'var(--color-green-light)' }}
              >
                <td className="py-2 px-3 font-medium">{LEVEL_LABELS[lvl]}</td>
                {(Object.keys(STATUS_LABELS) as SupervisionStatus[]).map((st) => {
                  const current = data.matrix[lvl][st];
                  const isEditing = editing?.level === lvl && editing?.status === st;
                  const blocked = isBlocked(lvl);

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
                      ) : blocked ? (
                        <span>{current}</span>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          onClick={() => startEdit(lvl, st, current)}
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
