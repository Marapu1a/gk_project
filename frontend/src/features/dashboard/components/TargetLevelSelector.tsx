// src/features/user/components/TargetLevelSelector.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { useSetTargetLevel } from '@/features/user/hooks/useSetTargetLevel';
import type { TargetLevel as ApiTargetLevel } from '@/features/user/api/setTargetLevel';
import type { CurrentUser } from '@/features/auth/api/me';
import { isTargetLocked } from '@/features/auth/api/me';
import { toast } from 'sonner';

const LEVELS = ['INSTRUCTOR', 'CURATOR', 'SUPERVISOR'] as const;
type Level = (typeof LEVELS)[number];
type GoalMode = 'CERTIFICATION' | 'RENEWAL';

const RU_BY_LEVEL: Record<Level, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

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

function resolveCurrentLevel(activeGroupName?: string | null): Level | null {
  if (activeGroupName === 'Инструктор') return 'INSTRUCTOR';
  if (activeGroupName === 'Куратор') return 'CURATOR';
  if (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор') {
    return 'SUPERVISOR';
  }
  return null;
}

function getDisplayedCurrentLevelName(user: CurrentUser): string {
  const activeGroupName = user.activeGroup?.name;

  if (activeGroupName === 'Опытный Супервизор') {
    return 'Опытный супервизор';
  }

  if (activeGroupName === 'Супервизор' && user.activeCycle?.type === 'RENEWAL') {
    return 'Супервизор';
  }

  if (user.targetLevel) {
    return RU_BY_LEVEL[user.targetLevel as Level];
  }

  if (
    activeGroupName === 'Инструктор' ||
    activeGroupName === 'Куратор' ||
    activeGroupName === 'Супервизор'
  ) {
    return activeGroupName;
  }

  return 'не выбран';
}

function getRenewalOptionLabel(
  level: Level,
  user: CurrentUser,
  canRenewCurrentLevel: boolean,
  currentLevel: Level | null,
) {
  const activeGroupName = user.activeGroup?.name;
  const isCurrentRenewalOption = canRenewCurrentLevel && currentLevel === level;

  if (!isCurrentRenewalOption) {
    return RU_BY_LEVEL[level];
  }

  if (level === 'SUPERVISOR' && activeGroupName === 'Опытный Супервизор') {
    return 'Опытный супервизор (ресертификация)';
  }

  return `${RU_BY_LEVEL[level]} (ресертификация)`;
}

type Props = {
  user: CurrentUser;
  isAdmin: boolean;
};

export function TargetLevelSelector({ user, isAdmin }: Props) {
  const setTarget = useSetTargetLevel(user.id);

  const [selected, setSelected] = useState<Level | ''>((user.targetLevel ?? '') as Level | '');

  useEffect(() => {
    setSelected((user.targetLevel ?? '') as Level | '');
  }, [user.targetLevel]);

  const activeIdx = user.activeGroup
    ? FULL_ORDER.indexOf(user.activeGroup.name as (typeof FULL_ORDER)[number])
    : -1;

  const activeGroupName = user.activeGroup?.name;
  const currentLevel = resolveCurrentLevel(activeGroupName);
  const renewalEligibleLevel = (user.renewalEligibleLevel ?? null) as Level | null;
  const canRenewCurrentLevel = !!currentLevel && renewalEligibleLevel === currentLevel;

  const isRenewalCycle = user.activeCycle?.type === 'RENEWAL';
  const displayedCurrentLevelName = getDisplayedCurrentLevelName(user);

  const availableLevels: Level[] = useMemo(() => {
    const levelsAbove = LEVELS.filter((lvl) => levelIndex(lvl) > activeIdx);

    if (canRenewCurrentLevel && currentLevel && !levelsAbove.includes(currentLevel)) {
      return [currentLevel, ...levelsAbove];
    }

    return levelsAbove;
  }, [activeIdx, canRenewCurrentLevel, currentLevel]);

  useEffect(() => {
    if (selected && !availableLevels.includes(selected)) {
      setSelected('');
    }
  }, [selected, availableLevels]);

  const locked = isTargetLocked(user) && !isAdmin;

  const targetLevel = user.targetLevel as ApiTargetLevel | null;

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
      ? 'Цель уже выбрана. Сменить можно после завершения текущего цикла или через администратора.'
      : serverErr === 'TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP'
        ? 'Эта цель недоступна для вашего текущего уровня.'
        : serverErr === 'RENEWAL_TARGET_NOT_ALLOWED'
          ? 'Ресертификация для этого уровня сейчас недоступна.'
          : serverErr === 'RENEWAL_NOT_AVAILABLE'
            ? 'Ресертификация недоступна: нет действующего сертификата.'
            : serverErr === 'TARGET_BELOW_ACTIVE'
              ? 'Нельзя выбрать цель ниже уже достигнутого уровня.'
              : serverErr === 'INVALID_GOAL_MODE'
                ? 'Некорректный режим выбора цели.'
                : serverErr === 'ACTIVE_CYCLE_EXISTS'
                  ? 'У вас уже есть активный цикл. Сначала прервите его.'
                  : null;

  const doMutate = (nextTarget: ApiTargetLevel | null, goalMode: GoalMode) => {
    setTarget.mutate({
      targetLevel: nextTarget,
      goalMode,
    });
  };

  const handleSave = () => {
    if (saveDisabled) return;

    const nextTarget = selected === '' ? null : (selected as ApiTargetLevel);

    if (nextTarget) {
      const isRenewalChoice = canRenewCurrentLevel && currentLevel === nextTarget;
      const goalMode: GoalMode = isRenewalChoice ? 'RENEWAL' : 'CERTIFICATION';

      let label = RU_BY_LEVEL[nextTarget as Level];

      if (
        isRenewalChoice &&
        nextTarget === 'SUPERVISOR' &&
        activeGroupName === 'Опытный Супервизор'
      ) {
        label = 'Опытный супервизор';
      }

      toast(
        isRenewalChoice
          ? `Вы выбираете ресертификацию уровня «${label}». Изменить цель будет нельзя, пока цикл не завершён.`
          : `Вы выбираете уровень «${label}». Изменить цель будет нельзя, пока цикл не завершён.`,
        {
          action: {
            label: 'Подтвердить',
            onClick: () => doMutate(nextTarget, goalMode),
          },
          cancel: {
            label: 'Отмена',
            onClick: () => {
              //
            },
          },
        },
      );
    } else {
      doMutate(null, 'CERTIFICATION');
    }
  };

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--color-blue-soft)' }}>
      <div>
        <strong>
          {isRenewalCycle ? 'Текущая цель: ресертификация уровня' : 'Текущий уровень сертификации'}:
        </strong>{' '}
        {displayedCurrentLevelName}
        {locked && (
          <span className="ml-2 inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            цель зафиксирована
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600">
        {isRenewalCycle
          ? 'Вы находитесь в процессе ресертификации. Сменить цель нельзя до завершения или отмены текущего цикла.'
          : 'Выберите цель: повышение уровня или ресертификацию текущего уровня, если она доступна. После выбора изменить цель нельзя до завершения цикла.'}
      </p>

      {!isRenewalCycle && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border rounded-md px-2 py-1"
            value={selected}
            onChange={(e) => {
              const v = e.target.value as '' | Level;
              setSelected(v === '' ? '' : (v as Level));
            }}
            disabled={locked}
          >
            <option value="">— Выберите уровень сертификации —</option>
            {availableLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {getRenewalOptionLabel(lvl, user, canRenewCurrentLevel, currentLevel)}
              </option>
            ))}
          </select>

          <Button onClick={handleSave} disabled={saveDisabled}>
            Сохранить
          </Button>

          {setTarget.isError && (
            <span className="text-red-600">{lockedMsg ?? 'Ошибка сохранения цели'}</span>
          )}
          {setTarget.isSuccess && <span className="text-green-600">Цель обновлена</span>}
        </div>
      )}
    </div>
  );
}
