// src/features/ceu/hooks/useCeuHistory.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuHistory, type CeuHistoryPeriod } from '../api/getCeuHistory';

export function useCeuHistory(period: CeuHistoryPeriod = 'current') {
  return useQuery({
    queryKey: ['ceu', 'history', period],
    queryFn: () => getCeuHistory(period),
    staleTime: 60 * 1000, // 1 минута
  });
}
