// src/features/user/components/TargetLevelSelector.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { useSetTargetLevel } from '@/features/user/hooks/useSetTargetLevel';
import type { TargetLevel as ApiTargetLevel } from '@/features/user/api/setTargetLevel';
import type { CurrentUser } from '@/features/auth/api/me';
import { isTargetLocked } from '@/features/auth/api/me';
import { toast } from 'sonner';

const LEVELS = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
type Level = (typeof LEVELS)[number];

const RU_BY_LEVEL: Record<Level, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

// без «Соискатель» цели нет, но он может быть активным
const FULL_ORDER = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

function levelIndex(lvl: Level) {
  return FULL_ORDER.indexOf(RU_BY_LEVEL[lvl] as (typeof FULL_ORDER)[number]);
}

type Props = {
  user: CurrentUser;
  isAdmin: boolean;
};

export function TargetLevelSelector({ user, isAdmin }: Props) {
  const setTarget = useSetTargetLevel(user.id);

  // локальное состояние: либо Level, либо пустая строка для «лесенки»
  const [selected, setSelected] = useState<Level | ''>((user.targetLevel ?? '') as Level | '');

  // синхронимся, когда обновляется user.targetLevel
  useEffect(() => {
    setSelected((user.targetLevel ?? '') as Level | '');
  }, [user.targetLevel]);

  const activeIdx = user.activeGroup
    ? FULL_ORDER.indexOf(user.activeGroup.name as (typeof FULL_ORDER)[number])
    : -1;

  // доступны только уровни строго выше активной группы
  const availableLevels: Level[] = LEVELS.filter((lvl) => levelIndex(lvl) > activeIdx);

  // если выбранный уровень стал недоступен (повышение) — сброс на «лесенку»
  useEffect(() => {
    if (selected && !availableLevels.includes(selected)) {
      setSelected('');
    }
  }, [selected, availableLevels]);

  const locked = isTargetLocked(user) && !isAdmin;

  const targetLevel = user.targetLevel as ApiTargetLevel | null;
  const targetLevelName = targetLevel ? RU_BY_LEVEL[targetLevel as Level] : undefined;
  const targetNameForBadge = targetLevelName ?? 'не выбрана (по умолчанию)';

  const noChange =
    (selected === '' && targetLevel === null) || (selected !== '' && targetLevel === selected);

  const saveDisabled =
    setTarget.isPending ||
    locked ||
    noChange ||
    (selected !== '' && !availableLevels.includes(selected));

  const serverErr = (setTarget.error as any)?.response?.data?.error as string | undefined;
  const lockedMsg =
    serverErr === 'TARGET_LOCKED'
      ? 'Цель уже выбрана. Сменить можно после повышения уровня или через администратора.'
      : null;

  const selectDisabled = locked;

  const doMutate = (nextTarget: ApiTargetLevel | null) => {
    setTarget.mutate(nextTarget);
  };

  const handleSave = () => {
    if (saveDisabled) return;

    const nextTarget = selected === '' ? null : (selected as ApiTargetLevel);

    // если цель реально выбирается (не лесенка) — спрашиваем подтверждение через toast
    if (nextTarget) {
      const label = RU_BY_LEVEL[nextTarget as Level];

      toast(
        `Вы собираетесь выбрать цель: «${label}». После выбора изменить её нельзя, пока вы не сдадите квалификационный экзамен.`,
        {
          action: {
            label: 'Подтвердить',
            onClick: () => doMutate(nextTarget),
          },
          cancel: {
            label: 'Отмена',
            onClick: () => {
              /* ничего не делаем */
            },
          },
        },
      );
    } else {
      // переключение обратно на «лесенку» — без подтверждения
      doMutate(null);
    }
  };

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--color-blue-soft)' }}>
      <div>
        <strong>Текущая цель:</strong> {targetNameForBadge}
        {locked && (
          <span className="ml-2 inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            выбор заблокирован до повышения уровня
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600">
        После выбора цели изменить её нельзя, пока вы не сдадите квалификационный экзамен. Если
        допустили ошибку, обратитесь к администратору.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="border rounded-md px-2 py-1"
          value={selected}
          onChange={(e) => {
            const v = e.target.value as '' | Level;
            setSelected(v === '' ? '' : (v as Level));
          }}
          disabled={selectDisabled}
          title={
            locked ? 'Сменить можно после повышения уровня (или через администратора)' : undefined
          }
        >
          <option value="">— Уровень сертификации —</option>
          {availableLevels.map((lvl) => (
            <option key={lvl} value={lvl}>
              {RU_BY_LEVEL[lvl]}
            </option>
          ))}
        </select>

        <Button
          onClick={handleSave}
          disabled={saveDisabled}
          title={
            locked ? 'Сменить можно после повышения уровня (или через администратора)' : undefined
          }
        >
          Сохранить
        </Button>

        {setTarget.isError && (
          <span className="text-red-600">{lockedMsg ?? 'Ошибка сохранения'}</span>
        )}
        {setTarget.isSuccess && <span className="text-green-600">Цель обновлена</span>}
      </div>
    </div>
  );
}
