// src/utils/supervisionRequirements.ts
/**
 * Требования по часам практики и супервизии для перехода между уровнями.
 * PRACTICE = часы практики (ранее INSTRUCTOR)
 * SUPERVISION = часы супервизии (ранее CURATOR)
 * SUPERVISOR = менторские часы (только для супервизоров)
 *
 * Значения — накопительные (total), как в таблице.
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

const groupOrder = ['Студент', 'Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'] as const;

/**
 * Возвращает требования для следующей квалификационной группы.
 * Если текущая последняя — null.
 */
export function getNextGroupName(current: string): string | null {
  const i = groupOrder.indexOf(current as any);
  return i >= 0 && i + 1 < groupOrder.length ? groupOrder[i + 1] : null;
}

/**
 * Имя предыдущей группы (для дельт).
 */
export function getPrevGroupName(current: string): string | null {
  const i = groupOrder.indexOf(current as any);
  return i > 0 ? groupOrder[i - 1] : null;
}

/**
 * Коэффициент пересчёта практики в супервизию ДЛЯ КОНКРЕТНОГО ШАГА.
 *
 * Считаем по дельте между уровнями, а не по абсолютным значениям:
 *
 * Студент → Инструктор:
 *   300 practice / 10 supervision = 30
 *
 * Инструктор → Куратор:
 *   (800 - 300) practice / (35 - 10) supervision = 500 / 25 = 20
 *
 * Куратор → Супервизор:
 *   (1300 - 800) practice / (60 - 35) supervision = 500 / 25 = 20
 *
 * Возвращает: сколько часов ПРАКТИКИ нужно на 1 час СУПЕРВИЗИИ для ПЕРЕХОДА
 * в указанную группу.
 */
export function getPracticeToSupervisionRatio(groupName: string): number | null {
  const targetReq = supervisionRequirementsByGroup[groupName];
  if (!targetReq) return null;

  const prevName = getPrevGroupName(groupName);
  const prevReq = prevName ? supervisionRequirementsByGroup[prevName] : undefined;

  // если предыдущего уровня нет (Студент → Инструктор) — считаем от нуля
  const prevPractice = prevReq?.practice ?? 0;
  const prevSupervision = prevReq?.supervision ?? 0;

  const practiceDelta = targetReq.practice - prevPractice;
  const supervisionDelta = targetReq.supervision - prevSupervision;

  if (practiceDelta <= 0 || supervisionDelta <= 0) return null;

  return practiceDelta / supervisionDelta;
}

/**
 * Авторасчёт часов супервизии по подтверждённым часам практики
 * ДЛЯ ТЕКУЩЕГО ШАГА (между предыдущей группой и groupName).
 *
 * Ожидается, что practiceHours — это часы практики,
 * которые учитываются на ЭТОМ шаге (дельта), а не весь накопленный объём.
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
