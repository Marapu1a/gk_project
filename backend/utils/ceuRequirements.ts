/**
 * Требования по CEU.
 */

export type CEUSummary = {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
  total: number;
};

export const GROUP_ORDER = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

export type GroupName = (typeof GROUP_ORDER)[number];

export const ceuRequirementsByGroup: Record<GroupName, CEUSummary> = {
  'Соискатель': { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 },
  'Инструктор': { ethics: 1, cultDiver: 1, supervision: 0, general: 2, total: 4 },
  'Куратор': { ethics: 2, cultDiver: 2, supervision: 0, general: 2, total: 6 },
  'Супервизор': { ethics: 2, cultDiver: 2, supervision: 2, general: 6, total: 12 },
  'Опытный Супервизор': { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 },
};

/**
 * Требования CEU для цикла ресертификации.
 */
export const renewalCeuRequirementsByGroup: Partial<Record<GroupName, CEUSummary>> = {
  'Инструктор': {
    ethics: 2,
    cultDiver: 2,
    supervision: 0,
    general: 4,
    total: 8,
  },
  'Куратор': {
    ethics: 4,
    cultDiver: 4,
    supervision: 0,
    general: 4,
    total: 12,
  },
  'Супервизор': {
    ethics: 4,
    cultDiver: 4,
    supervision: 4,
    general: 12,
    total: 24,
  },
  'Опытный Супервизор': {
    ethics: 4,
    cultDiver: 4,
    supervision: 4,
    general: 12,
    total: 24,
  },
};

export function getNextGroupName(current: string): GroupName | null {
  const i = GROUP_ORDER.indexOf(current as GroupName);
  return i >= 0 && i + 1 < GROUP_ORDER.length ? GROUP_ORDER[i + 1] : null;
}
