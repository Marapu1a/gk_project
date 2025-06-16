// src/features/ceu/hooks/useCeuHistory.ts
import { useQuery } from '@tanstack/react-query';
import { getCeuHistory } from '../api/getCeuHistory';

export function useCeuHistory() {
  return useQuery({
    queryKey: ['ceu', 'history'],
    queryFn: getCeuHistory,
    staleTime: 60 * 1000, // 1 минута
  });
}
