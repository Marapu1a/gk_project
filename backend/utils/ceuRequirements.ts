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
 * Требования CEU для целевой группы.
 * Ключ — русское имя группы.
 */
export const ceuRequirementsByGroup: Record<GroupName, CEUSummary> = {
  'Соискатель': { ethics: 0, cultDiver: 0, supervision: 0, general: 0 }, // базовый уровень
  'Инструктор': { ethics: 1, cultDiver: 1, supervision: 0, general: 2 },
  'Куратор': { ethics: 2, cultDiver: 2, supervision: 0, general: 4 },
  'Супервизор': { ethics: 2, cultDiver: 2, supervision: 2, general: 6 },
  'Опытный Супервизор': { ethics: 0, cultDiver: 0, supervision: 0, general: 0 }, // верхняя ступень
};

/**
 * Возвращает название следующей группы. Если текущая последняя — null.
 */
export function getNextGroupName(current: string): GroupName | null {
  const i = GROUP_ORDER.indexOf(current as GroupName);
  return i >= 0 && i + 1 < GROUP_ORDER.length ? GROUP_ORDER[i + 1] : null;
}
