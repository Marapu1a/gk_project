// src/features/supervision/hooks/useSupervisionSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getSupervisionSummary, type SupervisionSummaryResponse } from '../api/getSupervisionSummary';

export function useSupervisionSummary() {
  return useQuery<SupervisionSummaryResponse>({
    queryKey: ['supervision', 'summary'],
    queryFn: getSupervisionSummary,
    staleTime: 5 * 60 * 1000,
  });
}
