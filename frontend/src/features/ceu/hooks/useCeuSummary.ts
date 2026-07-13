// src/features/ceu/hooks/useCeuSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuSummary, type CeuSummaryResponse, type Level } from '../api/getCeuSummary';

export const ceuSummaryQueryKey = ['ceuSummary'] as const;
export const ceuSummaryByLevelQueryKey = (level?: Level | null) =>
  [...ceuSummaryQueryKey, { level: level ?? null }] as const;

export function useCeuSummary(level?: Level | null) {
  return useQuery<CeuSummaryResponse>({
    queryKey: ceuSummaryByLevelQueryKey(level),
    queryFn: () => getCeuSummary(level ?? undefined),
    staleTime: 5 * 60 * 1000,
  });
}
