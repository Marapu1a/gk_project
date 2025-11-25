// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

// enum цели (трека)
export type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

// Структура совпадает по форме и с "требованиями", и с фактическими часами.
// Семантика разная, но по типам нам этого достаточно.
export type SupervisionSummary = {
  practice: number;     // часы практики
  supervision: number;  // часы супервизии
  supervisor: number;   // менторские часы
};

export interface SupervisionSummaryResponse {
  // Требования к целевой группе (или null, если цели нет — верхняя ступень и т.п.)
  required: SupervisionSummary | null;

  // Проценты выполнения по practice/supervision/supervisor относительно required
  // (null, если required = null)
  percent: SupervisionSummary | null;

  // Фактически засчитанные часы по текущему треку (с учётом "сгорания" инструктора)
  usable: SupervisionSummary;

  // Потенциальные часы, которые добавятся, если все pending-записи подтвердят
  pending: SupervisionSummary;

  // Отдельная шкала для менторства (только если юзер уже супервизор/опытный супервизор)
  mentor: {
    total: number;
    required: number;
    percent: number;
    pending: number;
  } | null;
}

export async function getSupervisionSummary(
  level?: Level | null,
): Promise<SupervisionSummaryResponse> {
  const params = level ? { level } : undefined;
  const { data } = await api.get<SupervisionSummaryResponse>('/supervision/summary', {
    params,
  });
  return data;
}
