// src/features/ceu/hooks/useCeuSummary.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuSummary } from '../api/getCeuSummary';

export function useCeuSummary() {
  return useQuery({
    queryKey: ['ceu', 'summary'],
    queryFn: getCeuSummary,
    staleTime: 5 * 60 * 1000,
  });
}
