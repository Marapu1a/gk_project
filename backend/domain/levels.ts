import { TargetLevel } from '@prisma/client';

// ── Единый источник: уровень сертификации ↔ имя группы ↔ метка ──────────
// Раньше этот маппинг был скопирован инлайном в ~11 хендлеров (RU_BY_LEVEL /
// TARGET_RU_BY_LEVEL / mapTargetLevel / targetLevelRu) и мог тихо разойтись.
//
// ВАЖНО: groupName совпадает ДОСЛОВНО с именами групп в БД
// (Соискатель / Инструктор / Куратор / Супервизор / Опытный Супервизор).
// Эта строка используется как ключ поиска группы в БД (setTargetLevel),
// поэтому менять её можно только синхронно с таблицей Group.

export type GroupName = 'Инструктор' | 'Куратор' | 'Супервизор';

export const LEVELS: Record<TargetLevel, { groupName: GroupName; label: string }> = {
  INSTRUCTOR: { groupName: 'Инструктор', label: 'Инструктор' },
  CURATOR: { groupName: 'Куратор', label: 'Куратор' },
  SUPERVISOR: { groupName: 'Супервизор', label: 'Супервизор' },
};

/** Имя группы (= ключ в БД и в *RequirementsByGroup) для уровня цели. */
export function targetLevelToGroupName(level: TargetLevel): GroupName {
  return LEVELS[level].groupName;
}

/** Человекочитаемая метка уровня. Безопасна для произвольной строки (для экспортов). */
export function targetLevelLabel(level: TargetLevel | string | null | undefined): string {
  if (!level) return '';
  return (LEVELS as Record<string, { label: string }>)[level]?.label ?? '';
}

/** Все имена целевых групп (Инструктор/Куратор/Супервизор) — для запросов в БД. */
export const TARGET_GROUP_NAMES: GroupName[] = Object.values(LEVELS).map((l) => l.groupName);
