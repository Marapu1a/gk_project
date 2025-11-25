// src/utils/supervisionRequirements.ts

/**
 * Требования по часам практики и супервизии для ПОЛУЧЕНИЯ КОНКРЕТНОЙ ГРУППЫ.
 *
 * PRACTICE = часы практики
 * SUPERVISION = часы супервизии
 * SUPERVISOR = менторские часы (только для супервизоров, пока 0)
 *
 * Значения — НЕ накопительные между ступенями, а цель для экзамена на эту группу.
 * То, как именно учитываются часы при переходе (сгорают/переносятся), решается
 * уже в бизнес-логике с учётом выбранного трека (INSTRUCTOR | CURATOR | SUPERVISOR).
 */

export type SupervisionRequirement = {
  practice: number;
  supervision: number;
  supervisor: number;
};

export const supervisionRequirementsByGroup: Record<string, SupervisionRequirement> = {
  // Соискатель → Инструктор: 300 практики, 10 супервизии, коэффициент 30
  'Инструктор': { practice: 300, supervision: 10, supervisor: 0 },

  // Соискатель → Куратор (или после сброса часов инструкторских): 500 / 25, коэффициент 20
  'Куратор': { practice: 500, supervision: 25, supervisor: 0 },

  // Супервизор: 1500 / 75, коэффициент 20
  // При пути через куратора часть этих часов даётся "бонусом" — это уже решается бизнес-логикой.
  'Супервизор': { practice: 1500, supervision: 75, supervisor: 0 },

  // Верхняя ступень, здесь количественных требований нет (решается отдельными правилами)
  'Опытный Супервизор': { practice: 0, supervision: 0, supervisor: 0 },
};

const groupOrder = ['Соискатель', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'] as const;

/**
 * Возвращает имя следующей группы в "лестнице" рангов.
 * Это абстрактный порядок (Соискатель → Инструктор → …), он не учитывает выбор трека.
 */
export function getNextGroupName(current: string): string | null {
  const i = groupOrder.indexOf(current as any);
  return i >= 0 && i + 1 < groupOrder.length ? groupOrder[i + 1] : null;
}

/**
 * Имя предыдущей группы в общем порядке рангов.
 * Может использоваться там, где нужна логика "относительно текущей группы".
 */
export function getPrevGroupName(current: string): string | null {
  const i = groupOrder.indexOf(current as any);
  return i > 0 ? groupOrder[i - 1] : null;
}

/**
 * Коэффициент пересчёта практики в супервизию ДЛЯ ПОЛУЧЕНИЯ УКАЗАННОЙ ГРУППЫ.
 *
 * Пример:
 *   Инструктор: 300 practice / 10 supervision = 30
 *   Куратор:   500 practice / 25 supervision = 20
 *   Супервизор:1500 practice / 75 supervision = 20
 *
 * Возвращает: сколько часов ПРАКТИКИ нужно на 1 час СУПЕРВИЗИИ,
 * если мы целимся в указанную группу.
 * Конкретный "шаг" (с нуля, после сброса, с учётом бонуса от куратора и т.п.)
 * определяется бизнес-логикой с учётом трека пользователя.
 */
export function getPracticeToSupervisionRatio(groupName: string): number | null {
  const targetReq = supervisionRequirementsByGroup[groupName];
  if (!targetReq) return null;

  const { practice, supervision } = targetReq;
  if (practice <= 0 || supervision <= 0) return null;

  return practice / supervision;
}

/**
 * Авторасчёт часов супервизии по подтверждённым часам практики
 * ДЛЯ КОНКРЕТНОЙ ЦЕЛЕВОЙ ГРУППЫ.
 *
 * Ожидается, что practiceHours — это те часы практики,
 * которые мы считаем для ЭТОГО шага (с учётом трека и базовой точки).
 *
 * Каждое полное "ratio" практики даёт 1 час супервизии.
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
