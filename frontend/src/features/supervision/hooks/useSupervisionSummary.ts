// src/features/supervision/hooks/useSupervisionSummary.ts
import { useQuery } from '@tanstack/react-query';
import {
  getSupervisionSummary,
  type SupervisionSummaryResponse,
  type Level,
} from '../api/getSupervisionSummary';

/**
 * Хук получения summary по супервизии.
 *
 * level:
 * - если передан → бэк считает прогресс для конкретного трека (INSTRUCTOR / CURATOR / SUPERVISOR)
 * - если не передан → бэк сам выберет активную цель (targetLevel или next group)
 */
export function useSupervisionSummary(level?: Level | null) {
  const lvl = level ?? undefined;

  return useQuery<SupervisionSummaryResponse>({
    queryKey: ['supervisionSummary', { level: lvl ?? 'auto' }],
    queryFn: () => getSupervisionSummary(lvl),

    // кэш разумный, но не вечный – чтобы прогресс не "залипал"
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,

    refetchOnWindowFocus: false,
  });
}
