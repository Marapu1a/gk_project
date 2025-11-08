// src/features/supervision/hooks/useSupervisionSummary.ts
import { useQuery } from '@tanstack/react-query';
import {
  getSupervisionSummary,
  type SupervisionSummaryResponse,
  type Level,
} from '../api/getSupervisionSummary';

/**
 * Хук SupervisionSummary.
 * Если передан level — требования считаются по выбранной цели.
 * Если нет — используется активная группа (лесенка).
 */
export function useSupervisionSummary(level?: Level | null) {
  const lvl = level ?? undefined;

  return useQuery<SupervisionSummaryResponse>({
    queryKey: ['supervision', 'summary', lvl ?? 'default'],
    queryFn: () => getSupervisionSummary(lvl),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
