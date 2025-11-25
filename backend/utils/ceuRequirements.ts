// src/utils/ceuRequirements.ts

/**
 * Требования по CEU для получения следующей квалификационной группы.
 *
 * Ключи суммарных значений:
 * - ethics        — часы по этике
 * - cultDiver     — культурное разнообразие
 * - supervision   — супервизия
 * - general       — общие CEU
 */

export type CEUSummary = {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
};

/** Фиксированный порядок квалификационных групп */
export const GROUP_ORDER = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

export type GroupName = (typeof GROUP_ORDER)[number];

/**
 * Требования CEU для целевой группы (экзамен / переход на СЛЕДУЮЩУЮ ступень).
 * Ключ — русское имя группы.
 */
export const ceuRequirementsByGroup: Record<GroupName, CEUSummary> = {
  'Соискатель': { ethics: 0, cultDiver: 0, supervision: 0, general: 0 }, // базовый уровень
  'Инструктор': { ethics: 1, cultDiver: 1, supervision: 0, general: 2 },
  'Куратор': { ethics: 2, cultDiver: 2, supervision: 0, general: 2 },
  'Супервизор': { ethics: 2, cultDiver: 2, supervision: 2, general: 6 },
  'Опытный Супервизор': { ethics: 0, cultDiver: 0, supervision: 0, general: 0 }, // верхняя ступень
};

/**
 * Годовые требования CEU (непрерывное образование),
 * которые нужно набирать КАЖДЫЙ год для поддержки статуса.
 *
 * Для супервизоров и опытных супервизоров:
 *  - 12 общих CEU
 *  - 4 по этике
 *  - 4 по культурному разнообразию
 *  - 4 по супервизии
 * Всего: 24 балла непрерывного образования.
 */
export const annualCeuRequirementsByGroup: Partial<Record<GroupName, CEUSummary>> = {
  'Супервизор': {
    ethics: 4,
    cultDiver: 4,
    supervision: 4,
    general: 12,
  },
  'Опытный Супервизор': {
    ethics: 4,
    cultDiver: 4,
    supervision: 4,
    general: 12,
  },
};

/**
 * Возвращает название следующей группы. Если текущая последняя — null.
 */
export function getNextGroupName(current: string): GroupName | null {
  const i = GROUP_ORDER.indexOf(current as GroupName);
  return i >= 0 && i + 1 < GROUP_ORDER.length ? GROUP_ORDER[i + 1] : null;
}
