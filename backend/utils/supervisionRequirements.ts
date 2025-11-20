// src/utils/supervisionRequirements.ts
/**
 * Требования по часам практики и супервизии для перехода между уровнями.
 * PRACTICE = часы практики (ранее INSTRUCTOR)
 * SUPERVISION = часы супервизии (ранее CURATOR)
 * SUPERVISOR = менторские часы (только для супервизоров)
 *
 * Значения взяты из таблицы, переданной на скриншоте 55a1fa45...
 */

export type SupervisionRequirement = {
  practice: number;
  supervision: number;
  supervisor: number;
};

export const supervisionRequirementsByGroup: Record<string, SupervisionRequirement> = {
  'Инструктор': { practice: 300, supervision: 10, supervisor: 0 },
  'Куратор': { practice: 800, supervision: 35, supervisor: 0 },
  'Супервизор': { practice: 1300, supervision: 60, supervisor: 0 },
  'Опытный Супервизор': { practice: 0, supervision: 0, supervisor: 0 }, // верхняя ступень
};

/**
 * Возвращает требования для следующей квалификационной группы.
 * Если текущая последняя — null.
 */
export function getNextGroupName(current: string): string | null {
  const order = ['Студент', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'];
  const i = order.indexOf(current);
  return i >= 0 && i + 1 < order.length ? order[i + 1] : null;
}

/**
 * Коэффициент пересчёта практики в супервизию для группы.
 * Сколько часов ПРАКТИКИ нужно на 1 час СУПЕРВИЗИИ.
 *
 * Пример: 300 practice / 10 supervision = 30.
 */
export function getPracticeToSupervisionRatio(groupName: string): number | null {
  const req = supervisionRequirementsByGroup[groupName];
  if (!req) return null;
  if (req.practice <= 0 || req.supervision <= 0) return null;

  return req.practice / req.supervision;
}

/**
 * Авторасчёт часов супервизии по подтверждённым часам практики.
 * Используем целые часы: каждое полное "ratio" практики даёт 1 час супервизии.
 *
 * Пример: practiceHours = 270, ratio = 30 → 9 часов супервизии.
 */
export function calcAutoSupervisionHours(params: {
  groupName: string;
  practiceHours: number;
}): number {
  const { groupName, practiceHours } = params;

  if (practiceHours <= 0) return 0;

  const ratio = getPracticeToSupervisionRatio(groupName);
  if (!ratio) return 0;

  return Math.floor(practiceHours / ratio);
}
