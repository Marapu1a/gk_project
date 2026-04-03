// src/utils/supervisionRequirements.ts
export const SUPERVISION_GROUP_ORDER = [
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
] as const;

export type SupervisionGroupName = (typeof SUPERVISION_GROUP_ORDER)[number];

export type SupervisionRequirement = {
  practice: number;
  supervision: number; // требуемые авто-часы супервизии для цели (используем для процентов)
  supervisor: number;  // менторские (если появятся)
};

export const supervisionRequirementsByGroup: Record<
  Exclude<SupervisionGroupName, 'Соискатель'>,
  SupervisionRequirement
> = {
  'Инструктор': { practice: 300, supervision: 10, supervisor: 0 },
  'Куратор': { practice: 500, supervision: 25, supervisor: 0 },
  'Супервизор': { practice: 1500, supervision: 75, supervisor: 0 },
  'Опытный Супервизор': { practice: 0, supervision: 0, supervisor: 0 },
};

export const renewalSupervisionRequirementsByGroup: Partial<
  Record<Exclude<SupervisionGroupName, 'Соискатель'>, SupervisionRequirement>
> = {
  'Инструктор': { practice: 200, supervision: 5, supervisor: 0 },
  'Куратор': { practice: 240, supervision: 12, supervisor: 0 },
  'Супервизор': { practice: 0, supervision: 0, supervisor: 24 },
  'Опытный Супервизор': { practice: 0, supervision: 0, supervisor: 24 },
};

export function getPracticeToSupervisionRatio(groupName: string): number | null {
  const targetReq = (supervisionRequirementsByGroup as Record<string, SupervisionRequirement | undefined>)[groupName];
  if (!targetReq) return null;

  const { practice, supervision } = targetReq;
  if (practice <= 0 || supervision <= 0) return null;

  return practice / supervision;
}

export function getRenewalPracticeToSupervisionRatio(groupName: string): number | null {
  const targetReq = (renewalSupervisionRequirementsByGroup as Record<string, SupervisionRequirement | undefined>)[groupName];
  if (!targetReq) return null;

  const { practice, supervision } = targetReq;
  if (practice <= 0 || supervision <= 0) return null;

  return practice / supervision;
}

export function calcAutoSupervisionHours(params: { groupName: string; practiceHours: number }): number {
  const { groupName, practiceHours } = params;
  if (practiceHours <= 0) return 0;

  const ratio = getPracticeToSupervisionRatio(groupName);
  if (!ratio) return 0;

  return Math.floor(practiceHours / ratio);
}

export function calcAutoRenewalSupervisionHours(params: { groupName: string; practiceHours: number }): number {
  const { groupName, practiceHours } = params;
  if (practiceHours <= 0) return 0;

  const ratio = getRenewalPracticeToSupervisionRatio(groupName);
  if (!ratio) return 0;

  return Math.floor(practiceHours / ratio);
}
