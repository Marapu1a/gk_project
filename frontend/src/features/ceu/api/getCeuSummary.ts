// src/features/ceu/api/getCeuSummary.ts
import { api } from '@/lib/axios';

export type Level = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

export interface CeuCategorySum {
  ethics: number;
  cultDiver: number;
  supervision: number;
  general: number;
}

export interface CeuSummaryResponse {
  /**
   * Требования.
   * null, если:
   * - нет активного цикла (CycleStatus.ACTIVE) у пользователя
   * - или бэк не смог определить требования (например, нет группы/цели)
   */
  required: CeuCategorySum | null;

  /**
   * Проценты прогресса по категориям.
   * null, если required === null (например, нет активного цикла).
   */
  percent: CeuCategorySum | null;

  /** Только CONFIRMED в рамках ACTIVE цикла */
  usable: CeuCategorySum;

  /** SPENT в рамках ACTIVE цикла */
  spent: CeuCategorySum;

  /** usable + spent */
  total: CeuCategorySum;
}

export async function getCeuSummary(level?: Level | null): Promise<CeuSummaryResponse> {
  const params = level ? { level } : undefined;
  const { data } = await api.get<CeuSummaryResponse>('/ceu/summary', { params });
  return data;
}
