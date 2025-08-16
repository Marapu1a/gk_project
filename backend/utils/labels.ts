// src/utils/labels.ts

// НЕ тянем типы из хендлеров, чтобы избежать циклов. Работаем со string.
export function labelCEUCategory(category: string): string {
  const map: Record<string, string> = {
    ETHICS: 'Этика',
    CULTURAL_DIVERSITY: 'Культурное разнообразие',
    SUPERVISION: 'Супервизия',
    GENERAL: 'Общие',
  };
  return map[category] ?? category;
}

export function labelCEUStatus(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED: 'Подтверждено',
    SPENT: 'Списано на сертификат',
    REJECTED: 'Отклонено',
  };
  return map[status] ?? status;
}

export function labelSupervisionLevel(level: string): string {
  const map: Record<string, string> = {
    INSTRUCTOR: 'Инструкторские',
    CURATOR: 'Кураторские',
    SUPERVISOR: 'Менторские',
  };
  return map[level] ?? level;
}

export function labelSupervisionStatus(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED: 'Подтверждено',
    UNCONFIRMED: 'На проверке',
  };
  return map[status] ?? status;
}
