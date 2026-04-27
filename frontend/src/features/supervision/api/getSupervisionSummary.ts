// src/features/supervision/api/getSupervisionSummary.ts
import { api } from '@/lib/axios';

export type SupervisionSummary = {
  practice: number;
  supervision: number;
  supervisor: number; // менторские часы (для супервизоров)
};

export type MentorSummary = {
  total: number;
  required: number; // сейчас 24
  percent: number;
  pending: number;
};

export type BonusSummary = {
  practice: number;
  fromCycleId: string | null;
};

export type PracticeBreakdown = {
  total: number;
  legacy: number;
  implementing: number;
  programming: number;
  bonus: number;
};

export type PendingPracticeBreakdown = {
  total: number;
  legacy: number;
  implementing: number;
  programming: number;
};

export type SupervisionDistribution = {
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
};

export type SupervisionBreakdown = {
  total: number;
  direct: number;
  nonObserving: number;
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
  distributedTotal: number;
  remaining: number;
};

export interface SupervisionSummaryResponse {
  /**
   * Требования к часам (в зависимости от targetLevel ACTIVE цикла).
   * null если:
   * - нет активного цикла
   * - или не удалось определить набор требований
   */
  required: SupervisionSummary | null;

  /**
   * Процент прогресса.
   * null если required === null
   */
  percent: SupervisionSummary | null;

  /** CONFIRMED (и авто-расчёт супервизии) */
  usable: SupervisionSummary;

  /** UNCONFIRMED (и авто-расчёт супервизии) */
  pending: SupervisionSummary;

  /** Только для базового "Супервизор", иначе null */
  mentor: MentorSummary | null;

  /**
   * Бонус-практика из последнего COMPLETED CURATOR цикла (если целимся в SUPERVISOR).
   * null если бонуса нет/не применим.
   */
  bonus: BonusSummary | null;

  /** Разбивка подтвержденной практики по подтипам */
  practiceBreakdown: PracticeBreakdown;

  /** Разбивка практики на проверке по подтипам */
  pendingPracticeBreakdown: PendingPracticeBreakdown;

  /** Ручное распределение авто-супервизии по подтипам */
  distribution: SupervisionDistribution | null;

  /** Сводка по общей и распределенной супервизии */
  supervisionBreakdown: SupervisionBreakdown;
}

export async function getSupervisionSummary(): Promise<SupervisionSummaryResponse> {
  const { data } = await api.get<SupervisionSummaryResponse>('/supervision/summary');
  return data;
}
