// src/features/supervision/hooks/useSupervisionSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getSupervisionSummary, type SupervisionSummaryResponse } from '../api/getSupervisionSummary';

/**
 * Summary по супервизии/практике.
 * Бэк считает строго в рамках ACTIVE цикла (если его нет — required/percent = null, суммы = 0).
 */
export function useSupervisionSummary() {
  return useQuery<SupervisionSummaryResponse>({
    queryKey: ['supervisionSummary'],
    queryFn: () => getSupervisionSummary(),

    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
