// src/features/ceu/hooks/useCeuSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuSummary, type CeuSummaryResponse } from '../api/getCeuSummary';

export function useCeuSummary() {
  return useQuery<CeuSummaryResponse>({
    queryKey: ['ceu', 'summary'],
    queryFn: getCeuSummary,
    staleTime: 5 * 60 * 1000,
  });
}
