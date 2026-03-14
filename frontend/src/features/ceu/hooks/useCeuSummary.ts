// src/features/ceu/hooks/useCeuSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuSummary, type CeuSummaryResponse, type Level } from '../api/getCeuSummary';

export function useCeuSummary(level?: Level | null) {
  return useQuery<CeuSummaryResponse>({
    queryKey: ['ceuSummary', { level: level ?? null }],
    queryFn: () => getCeuSummary(level ?? undefined),
    staleTime: 5 * 60 * 1000,
  });
}
