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

// порядок рангов (от Соискателя до вершины)
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

  // локальное состояние: либо Level, либо пустая строка для "цель не выбрана"
  const [selected, setSelected] = useState<Level | ''>((user.targetLevel ?? '') as Level | '');

  // синхронимся, когда обновляется user.targetLevel
  useEffect(() => {
    setSelected((user.targetLevel ?? '') as Level | '');
  }, [user.targetLevel]);

  const activeIdx = user.activeGroup
    ? FULL_ORDER.indexOf(user.activeGroup.name as (typeof FULL_ORDER)[number])
    : -1;

  const activeGroupName = user.activeGroup?.name;
  const isSupervisor = activeGroupName === 'Супервизор';
  const isSeniorSupervisor = activeGroupName === 'Опытный Супервизор';

  // доступны только уровни строго выше активной группы
  const availableLevels: Level[] = LEVELS.filter((lvl) => levelIndex(lvl) > activeIdx);

  // если выбранный уровень стал недоступен (повышение) — сброс на "нет цели"
  useEffect(() => {
    if (selected && !availableLevels.includes(selected)) {
      setSelected('');
    }
  }, [selected, availableLevels]);

  const locked = isTargetLocked(user) && !isAdmin;

  const targetLevel = user.targetLevel as ApiTargetLevel | null;
  const targetLevelName = targetLevel ? RU_BY_LEVEL[targetLevel as Level] : undefined;
  const targetNameForBadge = targetLevelName ?? 'не выбран';

  const noChange =
    (selected === '' && targetLevel === null) || (selected !== '' && targetLevel === selected);

  const noTargetsForRole = !isAdmin && (isSupervisor || isSeniorSupervisor);

  const saveDisabled =
    setTarget.isPending ||
    locked ||
    noChange ||
    noTargetsForRole ||
    (selected !== '' && !availableLevels.includes(selected));

  const serverErr = (setTarget.error as any)?.response?.data?.error as string | undefined;

  const lockedMsg =
    serverErr === 'TARGET_LOCKED'
      ? 'Цель уже выбрана. Сменить можно после повышения уровня или через администратора.'
      : serverErr === 'TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP'
        ? 'Эта цель недоступна для вашего текущего уровня.'
        : serverErr === 'TARGET_BELOW_ACTIVE'
          ? 'Нельзя выбрать цель ниже уже достигнутого уровня.'
          : serverErr === 'NO_TARGET_FOR_SUPERVISOR'
            ? 'Для супервизоров и опытных супервизоров цель больше не требуется.'
            : null;

  const selectDisabled = locked || noTargetsForRole;

  const doMutate = (nextTarget: ApiTargetLevel | null) => {
    setTarget.mutate(nextTarget);
  };

  const handleSave = () => {
    if (saveDisabled) return;

    const nextTarget = selected === '' ? null : (selected as ApiTargetLevel);

    // выбор конкретной цели — с подтверждением
    if (nextTarget) {
      const label = RU_BY_LEVEL[nextTarget as Level];

      toast(
        `Вы собираетесь выбрать уровень: «${label}». После выбора изменить его нельзя, пока вы не получите соответствующую квалификацию.`,
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
      // сброс цели на "нет пути" — тоже важное действие, но без модалки оставим (решать тебе)
      doMutate(null);
    }
  };

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--color-blue-soft)' }}>
      <div>
        <strong>Текущий уровень сертификации:</strong> {targetNameForBadge}
        {locked && (
          <span className="ml-2 inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            выбор заблокирован до повышения уровня
          </span>
        )}
        {noTargetsForRole && !locked && (
          <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            на вашем уровне дальнейшие цели не требуются
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600">
        Необходимо выбрать уровень: Инструктор, Куратор или Супервизор. После выбора изменить выбор
        нельзя, пока вы не подтвердите квалификацию. Если допустили ошибку, обратитесь к
        администратору.
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
            locked
              ? 'Сменить можно после повышения уровня (или через администратора)'
              : noTargetsForRole
                ? 'Для супервизоров и опытных супервизоров цель больше не требуется'
                : undefined
          }
        >
          <option value="">— Выберите уровень сертификации —</option>
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
            locked
              ? 'Сменить можно после повышения уровня (или через администратора)'
              : noTargetsForRole
                ? 'Для супервизоров и опытных супервизоров цель больше не требуется'
                : undefined
          }
        >
          Сохранить
        </Button>

        {setTarget.isError && (
          <span className="text-red-600">{lockedMsg ?? 'Ошибка сохранения цели'}</span>
        )}
        {setTarget.isSuccess && <span className="text-green-600">Цель обновлена</span>}
      </div>
    </div>
  );
}
